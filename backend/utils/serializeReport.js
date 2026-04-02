/**
 * API responses expect location as { lat, lng, address } for maps and UI.
 * MongoDB stores GeoJSON Point { type, coordinates: [lng, lat], address }.
 */
export function serializeReport(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject({ flattenMaps: true }) : { ...doc };

  const id = o._id != null ? String(o._id) : String(o.originalId || "");
  const loc = o.location;

  let location = null;
  if (loc && Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
    location = {
      lat: loc.coordinates[1],
      lng: loc.coordinates[0],
      address: loc.address || "Unknown address",
    };
  }

  const { _id, __v, ...rest } = o;
  return {
    ...rest,
    id,
    location,
  };
}

export function serializeReports(docs) {
  return docs.map((d) => serializeReport(d)).filter(Boolean);
}
