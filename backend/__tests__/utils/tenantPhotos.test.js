const {
  buildPhotoUrl,
  storageObjectKey,
  resolveTenantPhotoPath,
  resolveLegacyPhotoPath,
  safeBasename,
} = require('../../utils/tenantPhotos');

describe('tenantPhotos', () => {
  const companyId = '11111111-1111-4111-8111-111111111111';

  it('buildPhotoUrl includes company id', () => {
    expect(buildPhotoUrl(companyId, 'photo.webp')).toBe(
      `/api/v1/uploads/photos/${companyId}/photo.webp`
    );
  });

  it('storageObjectKey scopes objects by company', () => {
    expect(storageObjectKey(companyId, 'photo.webp')).toBe(`${companyId}/photo.webp`);
    expect(storageObjectKey(companyId, '../hack.webp')).toBeNull();
  });

  it('resolveTenantPhotoPath rejects path traversal', () => {
    expect(resolveTenantPhotoPath(companyId, '../secret.webp')).toBeNull();
    expect(resolveTenantPhotoPath(companyId, 'nested/hack.webp')).toBeNull();
  });

  it('resolveTenantPhotoPath accepts valid filenames', () => {
    const resolved = resolveTenantPhotoPath(companyId, '1234-abcd.webp');
    expect(resolved).toContain(companyId);
    expect(resolved).toMatch(/1234-abcd\.webp$/);
  });

  it('resolveLegacyPhotoPath stays in photos root', () => {
    const resolved = resolveLegacyPhotoPath('legacy.webp');
    expect(resolved).toMatch(/legacy\.webp$/);
    expect(resolveLegacyPhotoPath('../etc/passwd')).toBeNull();
  });

  it('safeBasename strips directory segments', () => {
    expect(safeBasename('photo.webp')).toBe('photo.webp');
    expect(safeBasename('../../x.webp')).toBeNull();
    expect(safeBasename('nested/hack.webp')).toBeNull();
    expect(safeBasename('')).toBeNull();
  });
});
