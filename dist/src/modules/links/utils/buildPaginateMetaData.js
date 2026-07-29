export function buildPaginationMeta(total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    return {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
    };
}
//# sourceMappingURL=buildPaginateMetaData.js.map