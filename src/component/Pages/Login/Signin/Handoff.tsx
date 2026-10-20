import { Box, Button, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { sendExchangeHandoff } from "../../../../api/api.ts";
import { AppError } from "../../../../api/request.ts";
import { setHeadlessFrameLoading } from "../../../../redux/globalStateSlice.ts";
import { useAppDispatch } from "../../../../redux/hooks.ts";
import { refreshUserSession } from "../../../../redux/thunks/session.ts";
import PageTitle from "../../../../router/PageTitle.tsx";
import { useQuery } from "../../../../util";
import DismissCircleFilled from "../../../Icons/DismissCircleFilled.tsx";

// 只允许跳转到站内路径，防止交接链接被用作开放重定向
const safeRedirect = (redirect: string | null): string => {
  if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
    return redirect;
  }
  return "/home";
};

// 会话交接页（/session/handoff?code=&redirect=）：原生客户端把一次性交接码带到网页视图，
// 兑换成登录会话后跳转到目标页面，实现 App 到网页的免登录。
const Handoff = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const query = useQuery();
  const [error, setError] = useState<string>();
  // 交接码只能兑换一次，避免重复执行
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    const code = query.get("code");
    if (!code) {
      setError(t("login.handoffFailed"));
      return;
    }

    dispatch(setHeadlessFrameLoading(true));
    dispatch(sendExchangeHandoff(code))
      .then((loginRes) => {
        dispatch(refreshUserSession(loginRes, safeRedirect(query.get("redirect"))));
      })
      .catch((e) => {
        setError(e instanceof AppError && e.message ? e.message : t("login.handoffFailed"));
      })
      .finally(() => {
        dispatch(setHeadlessFrameLoading(false));
      });
  }, []);

  return (
    <Box>
      <PageTitle title={t("login.handoffTitle")} />
      {error && (
        <>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 7,
            }}
          >
            <DismissCircleFilled fontSize={"large"} color={"error"} />
            <Typography
              variant={"h6"}
              sx={{
                color: (theme) => theme.palette.error.main,
                mt: 1,
              }}
            >
              {t("login.handoffFailedTitle")}
            </Typography>
            <Typography variant={"body2"} color={"text.secondary"} sx={{ mt: 1, textAlign: "center" }}>
              {error}
            </Typography>
          </Box>
          <Button onClick={() => navigate("/session")} sx={{ mt: 2 }} variant="contained" color="primary">
            {t("login.backToSingIn")}
          </Button>
        </>
      )}
    </Box>
  );
};

export default Handoff;
