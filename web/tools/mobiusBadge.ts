/** Shared faceted Mobius Squadron patch, in normalized decal coordinates. */
export function drawMobiusBadge(badgeFace: (material: string, coords: Array<[number, number]>, layer: number) => void): void {
    const disc = (material: string, radius: number, layer: number) => {
      const coords: Array<[number, number]> = Array.from({ length: 18 }, (_, i) => {
        const angle = 2 * Math.PI * i / 18;
        return [Math.cos(angle) * radius, Math.sin(angle) * radius];
      });
      badgeFace(material, coords, layer);
    };
    disc("black", 1.0, 0);
    disc("badgeBlue", 0.965, 1);
    disc("black", 0.91, 2);
    disc("badgeGray", 0.875, 3);
    disc("badgeSky", 0.705, 4);

    // Coarse gray land masses over the bright blue globe.
    badgeFace("badgeGray", [[-0.63, 0.43], [-0.37, 0.52], [-0.17, 0.36],
      [-0.22, 0.12], [-0.51, 0.07], [-0.65, 0.23]], 5);
    badgeFace("badgeGray", [[0.0, 0.55], [0.37, 0.6], [0.62, 0.35],
      [0.43, 0.14], [0.15, 0.22], [-0.04, 0.03]], 5);
    badgeFace("badgeGray", [[-0.47, -0.2], [-0.19, -0.05], [0.11, -0.13],
      [0.29, -0.41], [-0.08, -0.62], [-0.42, -0.51]], 5);

    // The Mobius-shaped dark band and blue return stroke.
    badgeFace("badgeDark", [[-0.75, 0.52], [-0.42, 0.53], [-0.18, 0.34],
      [-0.12, -0.2], [0.28, -0.27], [0.61, -0.12], [0.72, -0.22],
      [0.7, -0.52], [0.27, -0.63], [-0.43, -0.47], [-0.61, -0.07]], 6);
    badgeFace("badgeBlue", [[-0.73, 0.57], [-0.46, 0.65], [0.22, 0.48],
      [0.33, 0.31], [0.35, -0.37], [0.64, -0.43], [0.72, -0.3],
      [0.77, -0.53], [0.51, -0.72], [0.26, -0.65], [0.16, -0.49],
      [0.13, 0.19], [-0.35, 0.37], [-0.68, 0.41]], 7);

    // White flight path and four-point aircraft/star silhouette.
    badgeFace("white", [[-0.71, -0.54], [-0.38, -0.52], [0.0, -0.35],
      [0.3, -0.13], [0.55, 0.22], [0.59, 0.03], [0.37, -0.29],
      [0.04, -0.5], [-0.41, -0.67]], 8);
    badgeFace("white", [[0.59, 0.47], [0.65, 0.17], [0.84, 0.13],
      [0.65, 0.06], [0.59, -0.06], [0.54, 0.06], [0.39, 0.13],
      [0.54, 0.18]], 8);
}
