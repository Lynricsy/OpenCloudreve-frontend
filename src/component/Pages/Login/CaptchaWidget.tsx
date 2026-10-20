import { Box, CssBaseline, ThemeProvider } from "@mui/material";
import i18next from "i18next";
import { useCallback, useEffect } from "react";
import { useGeneratedTheme } from "../../../App.tsx";
import { useAppSelector } from "../../../redux/hooks.ts";
import { ConfigLoadState } from "../../../redux/siteConfigSlice.ts";
import { useQuery } from "../../../util";
import { Captcha, CaptchaParams } from "../../Common/Captcha/Captcha.tsx";
import CircularProgress from "../../Common/CircularProgress.tsx";

// 原生客户端注入的桥接对象：Android 通过 addJavascriptInterface 注入 CaptchaBridge，
// iOS 通过 WKScriptMessageHandler 注册名为 captcha 的消息处理器。
declare global {
  interface Window {
    CaptchaBridge?: { onToken: (json: string) => void };
    webkit?: { messageHandlers?: { captcha?: { postMessage: (message: string) => void } } };
  }
}

const postToNative = (params: CaptchaParams) => {
  const json = JSON.stringify(params);
  window.CaptchaBridge?.onToken(json);
  window.webkit?.messageHandlers?.captcha?.postMessage(json);
};

// 供移动客户端在 WebView 中加载的独立验证码页（/captcha），不带任何框架外壳。
// ?theme=dark|light 指定配色，?lng= 指定语言；验证完成后把 {captcha?, ticket?} 以 JSON 投递给原生端。
const CaptchaWidget = () => {
  const query = useQuery();
  const themeParam = query.get("theme");
  const lng = query.get("lng");
  const theme = useGeneratedTheme(themeParam === "dark" ? true : themeParam === "light" ? false : undefined, true);
  // 只用服务端最新返回的配置，避免本地缓存里的验证码类型已过期
  const basicLoaded = useAppSelector((state) => state.siteConfig.basic.loaded);

  useEffect(() => {
    if (lng && lng !== i18next.language) {
      i18next.changeLanguage(lng);
    }
  }, [lng]);

  const onStateChange = useCallback((params: CaptchaParams) => {
    postToNative(params);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: 2 }}>
        {basicLoaded === ConfigLoadState.Loaded ? (
          <Captcha onStateChange={onStateChange} generation={0} />
        ) : (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress />
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default CaptchaWidget;
