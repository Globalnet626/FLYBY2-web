# Supplied F-22 Raptor

`model.gltf` is preserved from the user's `low-poly-f22-raptor.zip`,
`source/model.gltf`. Its images and geometry buffers are embedded. The archive
provided no author or license file; the project's legacy asset notice does not
establish the provenance of this separately supplied model.

`tools/f22Mobius.ts` converts the glTF during `npm run convert`, preserving the
node transforms and baking the landing gear and weapon bays into their stowed
flight pose. It rotates the nose to +Z and scales the length to 18.9 world units.
Texture colors are sampled per triangle and converted to linear RGB for the
port's flat-colored mesh renderer; small texture details are simplified.

Both sides of both canted fins use the same faceted Mobius patch drawing as the
F-4, positioned in each fin's local coordinate system. The original glTF is not
modified to add the patches.
