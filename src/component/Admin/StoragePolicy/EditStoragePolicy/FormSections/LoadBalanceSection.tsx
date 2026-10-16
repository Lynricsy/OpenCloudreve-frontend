import { Typography } from "@mui/material";
import { useCallback, useContext } from "react";
import { useTranslation } from "react-i18next";
import { LoadBalanceChild, StoragePolicy } from "../../../../../api/dashboard";
import SettingForm from "../../../../Pages/Setting/SettingForm";
import { NoMarginHelperText, SettingSection, SettingSectionContent } from "../../../Settings/Settings";
import LoadBalanceChildrenEditor from "../../LoadBalanceChildrenEditor";
import { StoragePolicySettingContext } from "../StoragePolicySettingWrapper";

const LoadBalanceSection = () => {
  const { t } = useTranslation("dashboard");
  const { values, setPolicy } = useContext(StoragePolicySettingContext);

  const onChildrenChange = useCallback(
    (lb_children: LoadBalanceChild[]) => {
      setPolicy((p: StoragePolicy) => ({ ...p, settings: { ...p.settings, lb_children } }));
    },
    [setPolicy],
  );

  return (
    <SettingSection>
      <Typography variant="h6" gutterBottom>
        {t("policy.childPolicy")}
      </Typography>
      <SettingSectionContent>
        <SettingForm lgWidth={8}>
          <NoMarginHelperText>{t("policy.loadBalanceDes")}</NoMarginHelperText>
          <LoadBalanceChildrenEditor
            value={values.settings?.lb_children ?? []}
            onChange={onChildrenChange}
            selfId={values.id}
          />
          <NoMarginHelperText>{t("policy.childPolicyDes")}</NoMarginHelperText>
        </SettingForm>
      </SettingSectionContent>
    </SettingSection>
  );
};

export default LoadBalanceSection;
