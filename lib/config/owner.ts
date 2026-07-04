// The single site owner — used to gate owner-only extras (e.g. live bus speed
// and the last-known location of buses that have gone offline). Kept in one
// place so the client gate and the server gate can never drift apart.
export const OWNER_EMAIL = "ngrizo@gmail.com";

// The Јавен превоз operator account. Together with the owner (and site admins),
// it may see private fleet details such as vehicle registration plates. The
// authoritative gate is server-side (is_admin() OR the transport_parking
// agency); this constant only lets the client skip a pointless fetch for
// everyone else.
export const FLEET_OPERATOR_EMAIL = "prevoz@mojprilep.mk";
