'use server';

/**
 * @fileOverview A service for evaluating mathematical expressions.
 *
 * - evaluateExpression - Evaluates a mathematical expression string.
 */

export async function evaluateExpression(expression: string): Promise<{ result: number }> {
    try {
        // Replace common unicode math symbols
        let sanitizedExpression = expression
            .replace(/×/g, '*')
            .replace(/÷/g, '/');
        
        // Remove any non-mathematical characters, preserving numbers, operators, dots, parentheses, and spaces.
        sanitizedExpression = sanitizedExpression.replace(/[^0-9+\-*/.()\s]/g, '');

        // Trim trailing operators to prevent syntax errors on evaluation
        sanitizedExpression = sanitizedExpression.trim().replace(/[+\-*/.]+$/, '').trim();

        // If after sanitization, the expression is empty, there's nothing to calculate.
        if (!sanitizedExpression) {
            return { result: NaN };
        }
        
        // Use Function constructor for safer evaluation than eval() in this context
        const result = new Function('return ' + sanitizedExpression)();
        
        if (typeof result !== 'number' || !isFinite(result)) {
            console.error("Invalid result from expression:", result);
            return { result: NaN };
        }
        
        return { result };

    } catch (error) {
        console.error("Evaluation error:", error, "Original expression:", expression);
        return { result: NaN };
    }
}
