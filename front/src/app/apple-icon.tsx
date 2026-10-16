/** Home-screen icon for iPhone and iPad, which ignore the manifest's icons. */

import { appIcon } from "./components/brand/appIcon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return appIcon(size.width);
}
