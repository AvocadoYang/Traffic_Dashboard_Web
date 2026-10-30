/**
 * 這台電腦的瀏覽器能不能畫 3D: three.js r163 起只支援 WebGL 2。
 * 沒顯示卡的虛擬機、遠端桌面、驅動被瀏覽器封鎖時拿不到, 這時建 3D 畫布會直接丟錯,
 * 所以要畫 3D 的地方先問這個, 不行就只給 2D。結果記住, 不用每次都建一個測試用的畫布
 */
let supported: boolean | null = null;

export const webglAvailable = () => {
  if (supported === null) {
    try {
      const gl = document.createElement("canvas").getContext("webgl2");
      supported = !!gl;
      // 測完就還掉: 瀏覽器同時能開的 WebGL 畫布有上限
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      supported = false;
    }
  }
  return supported;
};
