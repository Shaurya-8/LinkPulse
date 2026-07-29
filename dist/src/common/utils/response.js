export function successResponse(res, data, message, statusCode = 200, meta) {
    const body = { success: true, message, data };
    if (meta)
        body.meta = meta;
    return res.status(statusCode).json(body);
}
export function errorResponse(res, message, statusCode, code, errors) {
    const body = { success: false, message };
    if (errors?.length)
        body.errors = errors;
    if (code)
        body.meta = { code };
    return res.status(statusCode).json(body);
}
//# sourceMappingURL=response.js.map