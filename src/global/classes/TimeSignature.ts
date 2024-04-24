/**
 * Pre-defined time signature denominators supported by OpenMarch.
 */
export enum BeatUnit {
    WHOLE = 1,
    HALF = 2,
    QUARTER = 4,
    EIGHTH = 8,
    SIXTEENTH = 16,
    THIRTY_SECOND = 32,
    SIXTY_FOURTH = 64
}

/**
 * A class representing a time signature ensuring valid numerator and denominator.
 */
class TimeSignature {
    readonly numerator: number;
    readonly denominator: 1 | 2 | 4 | 8 | 16 | 32 | 64;

    constructor(timeSignature: { numerator: number, denominator: 1 | 2 | 4 | 8 | 16 | 32 | 64 }) {
        const numerator = timeSignature.numerator;
        if (numerator <= 0 || !Number.isInteger(numerator))
            throw new Error("Invalid time signature numerator. Must be a positive integer.");
        this.numerator = timeSignature.numerator;
        this.denominator = timeSignature.denominator;
    }

    /**
     * Creates a new TimeSignature from a string representation of a time signature.
     *
     * @param timeSignature A string representation of a time signature. E.g. "4/4"
     * @returns
     */
    static fromString(timeSignature: string): TimeSignature {
        const split = timeSignature.split("/");
        if (split.length !== 2)
            throw new Error("Invalid time signature string. Must be in the form of '4/4'");
        const numerator = parseInt(split[0]);
        const denominator = parseInt(split[1]);
        const validDenominators = [1, 2, 4, 8, 16, 32, 64];
        if (!validDenominators.includes(denominator))
            throw new Error("Invalid time signature denominator. Must be 1, 2, 4, 8, 16, 32, or 64");

        return new TimeSignature({ numerator, denominator: denominator as 1 | 2 | 4 | 8 | 16 | 32 | 64 });
    }

    /**
     * @param other The other TimeSignature to compare to.
     * @returns true if the other TimeSignature is equal to this TimeSignature.
     */
    equals(other: TimeSignature): boolean {
        return this.numerator === other.numerator && this.denominator === other.denominator;
    }

    /**
     * Checks if an object is an instance of TimeSignature.
     *
     * @param obj The object to check if it is a TimeSignature.
     * @returns True if the object is a TimeSignature, false otherwise.
     */
    static instanceOf(obj: any): obj is TimeSignature {
        try {
            return obj.numerator !== undefined && obj.denominator !== undefined;
        } catch (TypeError) {
            return false;
        }
    }

    /**
     * @returns a string representation of the time signature. E.g. "4/4"
     */
    toString(): string {
        return `${this.numerator}/${this.denominator}`;
    }
}

export default TimeSignature;
