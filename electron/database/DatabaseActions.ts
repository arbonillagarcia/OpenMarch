import Database from "better-sqlite3";
import * as History from "./database.history";
import Constants from "../../src/global/Constants";

/**
 * Response from the database
 */
export interface DatabaseResponse<DatabaseItemType> {
    /** Whether the operation was a success */
    readonly success: boolean;
    /** Error message if the operation failed */
    readonly error?: { message: string; stack?: string };
    /** The data that was affected or returned by the operation */
    readonly data: DatabaseItemType;
}

/**
 * Decrement all of the undo actions in the most recent group down by one.
 *
 * This should be used when a database action should not create its own group, but the group number
 * was incremented to allow for rolling back changes due to error.
 *
 * @param db database connection
 */
function decrementLastUndoGroup(db: Database.Database) {
    const maxGroup = (
        db
            .prepare(
                `SELECT MAX(history_group) as max_undo_group FROM ${Constants.UndoHistoryTableName}`
            )
            .get() as { max_undo_group: number }
    ).max_undo_group;

    const previousGroup = (
        db
            .prepare(
                `SELECT MAX(history_group) as previous_group FROM ${Constants.UndoHistoryTableName} WHERE history_group < ?`
            )
            .get(maxGroup) as { previous_group: number }
    ).previous_group;

    if (previousGroup) {
        db.prepare(
            `UPDATE ${Constants.UndoHistoryTableName} SET history_group = ? WHERE history_group = ?`
        ).run(previousGroup, maxGroup);
    }
}

/**
 * Gets a single item from the table. If the item does not exist, an error is returned in the DatabaseResponse.
 *
 * @param db The database connection
 * @param id The id of the item to get
 * @param idColumn The column to check with WHERE to get the row. By default "rowid"
 * @param tableName The name of the table to get the item from
 * @returns A DatabaseResponse with the item
 */
export function getItem<DatabaseItemType>({
    id,
    db,
    tableName,
    idColumn = "rowid",
}: {
    id: number;
    db: Database.Database;
    tableName: string;
    idColumn?: string;
}): DatabaseResponse<DatabaseItemType | undefined> {
    let output: DatabaseResponse<DatabaseItemType | undefined>;
    try {
        const stmt = db.prepare(
            `SELECT * FROM ${tableName} WHERE "${idColumn}" = ?`
        );
        const result = stmt.get(id) as DatabaseItemType;
        if (!result) {
            output = {
                success: false,
                data: result,
                error: {
                    message: `No item with "${idColumn}"=${id} in table "${tableName}"`,
                },
            };
        } else {
            output = {
                success: true,
                data: result,
            };
        }
    } catch (error: any) {
        output = {
            success: false,
            data: undefined,
            error: {
                message:
                    error.message || `Error getting item "${idColumn}"=${id}`,
                stack: error.stack || "Unable to get error stack",
            },
        };
        console.error(`Failed to get item "${idColumn}"=${id}:`, error);
    }
    return output;
}

/**
 * Retrieves a set of columns for the specified table
 *
 * @param db database connection
 * @param tableName name of the table to get the columns for
 * @returns the set of columns for the given table
 */
function getColumns(db: Database.Database, tableName: string): Set<string> {
    return new Set(
        (
            db.prepare(`PRAGMA table_info(${tableName});`).all() as {
                name: string;
            }[]
        ).map((response) => response.name)
    );
}

/**
 * Gets all the items from the table
 *
 * @param db The database connection
 * @param id The id of the item to get
 * @param tableName The name of the table to get the item from
 * @returns A DatabaseResponse with the item
 */
export function getAllItems<DatabaseItemType>({
    db,
    tableName,
}: {
    db: Database.Database;
    tableName: string;
}): DatabaseResponse<DatabaseItemType[]> {
    let output: DatabaseResponse<DatabaseItemType[]>;
    try {
        const stmt = db.prepare(`SELECT * FROM ${tableName}`);
        const result = stmt.all() as DatabaseItemType[];
        if (!result) {
            output = {
                success: false,
                data: [],
                error: {
                    message: `No items in table "${tableName}"`,
                },
            };
        } else {
            output = {
                success: true,
                data: result,
            };
        }
    } catch (error: any) {
        output = {
            success: false,
            data: [],
            error: {
                message:
                    error.message || `Error getting items from ${tableName}`,
                stack: error.stack || "Unable to get error stack",
            },
        };
        console.error(`Failed to get item from ${tableName}:`, error);
    }
    return output;
}

/**
 * Builds the insert query for the arguments (e.g. "(name, age) VALUES (@name, @age)")
 *
 * @param args The arguments to build the insert query
 * @returns String with the query
 */
function insertClause<NewItemArgs extends Object>(args: NewItemArgs) {
    const keys = Object.keys(args);
    keys.sort();
    const columns = keys.join(", ");
    const values = keys.map((key) => `@${key}`).join(", ");
    return `(${columns}) VALUES (${values})`;
}

/**
 * @param db The database connection
 * @param items The items to insert
 * @param tableName The name of the table to get the item from
 * @param useNextUndoGroup Whether to increment the undo group, default is true
 * @returns The id of the inserted item
 */
export function createItems<DatabaseItemType, NewItemArgs extends Object>({
    db,
    items,
    tableName,
    useNextUndoGroup = true,
}: {
    db: Database.Database;
    items: NewItemArgs[];
    tableName: string;
    useNextUndoGroup?: boolean;
}): DatabaseResponse<DatabaseItemType[]> {
    console.log("\n=========== start createItems ===========");
    let output: DatabaseResponse<DatabaseItemType[]>;
    // Track if an action was performed so the undo group can be decremented if needed
    let actionWasPerformed = false;

    // Track if the undo group was changed in this function so it can be decremented if needed
    let groupWasIncremented = false;
    try {
        // Increment the undo group so this action can be rolled back if needed
        const currentUndoGroup = History.getCurrentUndoGroup(db);
        const newUndoGroup = History.incrementUndoGroup(db);
        groupWasIncremented = currentUndoGroup !== newUndoGroup;
        // Increment the undo group so this action can be rolled back if needed
        const newItemIds: number[] = [];
        const columns = getColumns(db, tableName);

        for (const oldItem of items) {
            const item = { ...oldItem }; // copy the object as to not modify the original reference
            // Remove the id from the new item if it exists
            let itemToInsert = item;
            if (Object.keys(item).includes("id")) {
                const { id, ...rest } = item as any;
                itemToInsert = rest;
            }

            const createdAt = new Date().toISOString();
            let newItem = itemToInsert as any;
            if (columns.has("created_at")) newItem.created_at = createdAt;
            if (columns.has("updated_at")) newItem.updated_at = createdAt;

            const stmt = db.prepare(
                `INSERT INTO ${tableName} ${insertClause(newItem)}`
            );
            actionWasPerformed = true;
            const insertResult = stmt.run(newItem);
            const id = insertResult.lastInsertRowid as number;
            newItemIds.push(id);
        }
        const newItems: DatabaseItemType[] = [];
        for (const id of newItemIds) {
            const newItem = getItem<DatabaseItemType>({
                id,
                db,
                tableName,
            }).data;
            if (!newItem) {
                throw new Error(
                    `No item with id ${id} in table "${tableName}"`
                );
            } else {
                newItems.push(newItem);
            }
        }
        output = {
            success: true,
            data: newItems as DatabaseItemType[],
        };

        // If the undo group was not supposed to be incremented, decrement all of the undo actions in the most recent group down by one
        if (!useNextUndoGroup && groupWasIncremented && actionWasPerformed)
            decrementLastUndoGroup(db);
    } catch (error: any) {
        output = {
            success: false,
            data: [],
            error: {
                message:
                    error.message || `Error getting items from ${tableName}`,
                stack: error.stack || "Unable to get error stack",
            },
        };

        // Roll back the changes caused by this action
        History.performUndo(db);
        History.clearMostRecentRedo(db);
    } finally {
        if (useNextUndoGroup) History.incrementUndoGroup(db);
        console.log("=========== end createItems ===========\n");
    }
    return output;
}

/**
 * @param db The database connection
 * @param items The items to update
 * @returns A DatabaseResponse with the updated items
 */
export function updateItems<
    DatabaseItemType,
    UpdatedItemArgs extends { id: number }
>({
    db,
    items,
    tableName,
    useNextUndoGroup = true,
}: {
    items: UpdatedItemArgs[];
    db: Database.Database;
    tableName: string;
    useNextUndoGroup?: boolean;
}): DatabaseResponse<DatabaseItemType[]> {
    console.log("\n=========== start updateItems ===========");
    // Check if all of the items exist
    const notFoundIds: number[] = [];
    const ids = new Set<number>(items.map((item) => item.id));
    let actionWasPerformed = false;

    // Verify all of the items exist before deleting any of them
    for (const id of ids) {
        if (
            getItem<DatabaseItemType>({ id, db, tableName }).data === undefined
        ) {
            notFoundIds.push(id);
        }
    }
    // Return an error if any of the items do not exist
    if (notFoundIds.length > 0) {
        return {
            success: false,
            data: [],
            error: {
                message: `No items with ids [${notFoundIds.join(
                    ", "
                )}] in table "${tableName}"`,
            },
        };
    }

    let output: DatabaseResponse<DatabaseItemType[]> = {
        success: false,
        data: [],
        error: { message: "Failed to update item" },
    };

    // Track if the undo group was changed in this function so it can be decremented if needed
    let groupWasIncremented = false;
    try {
        // Increment the undo group so this action can be rolled back if needed
        const currentUndoGroup = History.getCurrentUndoGroup(db);
        const newUndoGroup = History.incrementUndoGroup(db);
        groupWasIncremented = currentUndoGroup !== newUndoGroup;

        const columns = getColumns(db, tableName);

        const updateIds: number[] = [];
        for (const oldItem of items) {
            const item = { ...oldItem }; // Copy the old item as to not modify the original reference
            const updatedAt = new Date().toISOString();
            let updatedItem: any = item;
            if (columns.has("updated_at")) updatedItem.updated_at = updatedAt;

            // remove the id from the updated item
            const { id, ...rest } = updatedItem;
            const setClause = Object.keys(rest)
                .map((key) => `"${key}" = @${key}`)
                .join(", ");

            if (!Object.keys(updatedItem).includes("id")) {
                console.warn("No id provided for update, skipping item");
                continue;
            }
            const stmt = db.prepare(
                `UPDATE ${tableName} SET ${setClause} WHERE "rowid" = @id`
            );
            stmt.run(updatedItem);
            actionWasPerformed = true;
            updateIds.push(id);
        }
        const updatedItems: DatabaseItemType[] = [];
        for (const id of updateIds) {
            const updatedItem = getItem<DatabaseItemType>({
                id,
                db,
                tableName,
            });
            if (!updatedItem || !updatedItem.data || !updatedItem.success) {
                throw new Error(updatedItem.error?.message || "No item found");
            } else {
                updatedItems.push(updatedItem.data);
            }
        }
        // If the undo group was not supposed to be incremented, decrement all of the undo actions in the most recent group down by one
        if (!useNextUndoGroup && actionWasPerformed && groupWasIncremented)
            decrementLastUndoGroup(db);

        output = {
            success: true,
            data: updatedItems,
        };
    } catch (error: any) {
        output = {
            success: false,
            data: [],
            error: {
                message:
                    error.message || `Error updating items from ${tableName}`,
                stack: error.stack || "Unable to get error stack",
            },
        };

        console.error(`Failed to update items from ${tableName}:`, error);

        // Roll back the changes caused by this action
        if (actionWasPerformed) {
            History.performUndo(db);
            History.clearMostRecentRedo(db);
        }
    } finally {
        console.log("=========== end updateItems ===========\n");
        if (useNextUndoGroup) History.incrementUndoGroup(db);
    }
    return output;
}

/**
 * @param db The database connection
 * @param ids The ids of the items to delete
 * @param tableName The name of the table to get the item from
 * @param idColumn The column to check with WHERE to delete the row. By default "rowid"
 * @param useNextUndoGroup Whether to increment the undo group after the action is performed, default is true
 * @returns A DatabaseResponse with the deleted item
 */
export function deleteItems<DatabaseItemType>({
    ids,
    db,
    tableName,
    useNextUndoGroup,
    idColumn = "rowid",
}: {
    ids: Set<number>;
    db: Database.Database;
    tableName: string;
    useNextUndoGroup?: boolean;
    idColumn?: string;
}): DatabaseResponse<DatabaseItemType[]> {
    console.log("\n=========== start deleteItems ===========");
    const deletedObjects: DatabaseItemType[] = [];
    let output: DatabaseResponse<DatabaseItemType[]>;
    let currentId: number | undefined;
    const notFoundIds: number[] = [];
    let actionWasPerformed = false;
    const itemsMap = new Map<number, DatabaseItemType>();

    // Verify all of the items exist before deleting any of them
    for (const id of ids) {
        const item = getItem<DatabaseItemType>({ id, db, tableName, idColumn });
        if (item.data === undefined) {
            notFoundIds.push(id);
        } else {
            itemsMap.set(id, item.data);
        }
    }
    // Return an error if any of the items do not exist
    if (notFoundIds.length > 0) {
        return {
            success: false,
            data: [],
            error: {
                message: `No items with ${idColumn}=[${notFoundIds.join(
                    ", "
                )}] in table "${tableName}"`,
            },
        };
    }

    // Track if the undo group was changed in this function so it can be decremented if needed
    let groupWasIncremented = false;
    try {
        // Increment the undo group so this action can be rolled back if needed
        const currentUndoGroup = History.getCurrentUndoGroup(db);
        const newUndoGroup = History.incrementUndoGroup(db);
        groupWasIncremented = currentUndoGroup !== newUndoGroup;
        // Increment the undo group so this action can be rolled back if needed
        History.incrementUndoGroup(db);

        for (const id of ids) {
            currentId = id;
            const item = itemsMap.get(id);
            if (!item) {
                throw new Error(`No item found with "${idColumn}"=${id}`);
            } else {
                const stmt = db.prepare(
                    `DELETE FROM ${tableName} WHERE "${idColumn}" = ?`
                );
                stmt.run(id);
                deletedObjects.push(item);
                actionWasPerformed = true;
            }
        }

        // If the undo group was not supposed to be incremented, decrement all of the undo actions in the most recent group down by one
        if (!useNextUndoGroup && actionWasPerformed && groupWasIncremented)
            decrementLastUndoGroup(db);

        output = {
            success: true,
            data: deletedObjects,
        };
    } catch (error: any) {
        output = {
            success: false,
            data: [],
            error: {
                message:
                    error.message ||
                    `Error deleting item ${currentId} while trying to delete items ${idColumn}"=${ids}`,
                stack: error.stack || "Unable to get error stack",
            },
        };
        console.error(
            `Failed to delete item ${currentId} while trying to delete items ${idColumn}"=${ids}:`,
            error
        );

        // Roll back the changes caused by this action
        if (actionWasPerformed) {
            History.performUndo(db);
            History.clearMostRecentRedo(db);
        }
    } finally {
        console.log("=========== end deleteItems ===========\n");
        if (useNextUndoGroup) History.incrementUndoGroup(db);
    }
    return output;
}
