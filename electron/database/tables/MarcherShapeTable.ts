import Constants from "../../../src/global/Constants";
import Database from "better-sqlite3";
import * as DbActions from "../DatabaseActions";
import { DatabaseResponse } from "../DatabaseActions";
import * as History from "../database.history";

export interface Shape {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
    notes: string;
}

export interface NewShapeArgs {
    name: string;
    notes?: string;
}

export interface ModifiedShapeArgs {
    id: number;
    name?: string;
    notes?: string;
}

/**
 * Creates the Shape table in the database with columns for id, name, timestamps, and notes.
 * Also sets up undo triggers for history tracking.
 * @param db The database instance
 */
export function createShapeTable(db: Database.Database) {
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS "${Constants.ShapeTableName}" (
                "id"            INTEGER PRIMARY KEY,
                "name"          TEXT,
                "created_at"    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at"    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "notes"         TEXT
            );
        `);
        History.createUndoTriggers(db, Constants.ShapeTableName);
    } catch (error) {
        console.error(
            `Failed to create ${Constants.ShapeTableName} table:`,
            error,
        );
    }
}
/**
 * Retrieves all shapes from the database
 * @param db The database instance
 * @returns DatabaseResponse containing an array of Shape objects
 */
export function getShapes({
    db,
}: {
    db: Database.Database;
}): DatabaseResponse<Shape[]> {
    return DbActions.getAllItems<Shape>({
        db,
        tableName: Constants.ShapeTableName,
    });
}

/**
 * Creates new shapes in the database
 * @param db The database instance
 * @param args Array of NewShapeArgs containing name and optional notes
 * @returns DatabaseResponse containing the created Shape objects
 */
export function createShape({
    db,
    args,
}: {
    db: Database.Database;
    args: NewShapeArgs[];
}): DatabaseResponse<Shape[]> {
    return DbActions.createItems<Shape, NewShapeArgs>({
        db,
        tableName: Constants.ShapeTableName,
        items: args,
    });
}

/**
 * Updates existing shapes in the database
 * @param db The database instance
 * @param args Array of ModifiedShapeArgs containing id and optional name/notes updates
 * @returns DatabaseResponse containing the updated Shape objects
 */
export function updateShape({
    db,
    args,
}: {
    db: Database.Database;
    args: ModifiedShapeArgs[];
}): DatabaseResponse<Shape[]> {
    return DbActions.updateItems<Shape, ModifiedShapeArgs>({
        db,
        tableName: Constants.ShapeTableName,
        items: args,
    });
}

/**
 * Deletes shapes from the database by their IDs
 * @param db The database instance
 * @param ids Set of shape IDs to delete
 * @returns DatabaseResponse containing the deleted Shape objects
 */
export function deleteShape({
    db,
    ids,
}: {
    db: Database.Database;
    ids: Set<number>;
}): DatabaseResponse<Shape[]> {
    return DbActions.deleteItems<Shape>({
        db,
        tableName: Constants.ShapeTableName,
        ids,
    });
}
