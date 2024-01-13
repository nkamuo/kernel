export default class Expression {

    private expression: string;

    constructor(expression: string) {
        this.expression = expression;
    }

    /**
     * Gets the expression.
     * @returns {string} The expression
     */
    toString(): string {
        return this.expression;
    }
}