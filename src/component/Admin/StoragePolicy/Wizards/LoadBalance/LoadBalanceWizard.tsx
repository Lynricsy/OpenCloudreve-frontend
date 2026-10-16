import { Button } from "@mui/material";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StoragePolicy } from "../../../../../api/dashboard";
import { PolicyType } from "../../../../../api/explorer";
import { DenseFilledTextField } from "../../../../Common/StyledComponents";
import SettingForm from "../../../../Pages/Setting/SettingForm";
import { NoMarginHelperText } from "../../../Settings/Settings";
import { AddWizardProps } from "../../AddWizardDialog";
import LoadBalanceChildrenEditor from "../../LoadBalanceChildrenEditor";

const LoadBalanceWizard = ({ onSubmit }: AddWizardProps) => {
  const { t } = useTranslation("dashboard");
  const formRef = useRef<HTMLFormElement>(null);
  const [policy, setPolicy] = useState<StoragePolicy>({
    id: 0,
    name: "",
    type: PolicyType.load_balance,
    settings: {
      lb_children: [],
    },
    edges: {},
  });

  const children = policy.settings?.lb_children ?? [];

  const handleSubmit = () => {
    if (!formRef.current?.checkValidity()) {
      formRef.current?.reportValidity();
      return;
    }
    if (children.length == 0 || children.some((c) => c.id <= 0)) {
      return;
    }
    onSubmit(policy);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <SettingForm title={t("policy.name")} lgWidth={12}>
        <DenseFilledTextField
          fullWidth
          required
          value={policy.name}
          onChange={(e) => setPolicy({ ...policy, name: e.target.value })}
        />
        <NoMarginHelperText>{t("policy.policyName")}</NoMarginHelperText>
      </SettingForm>
      <SettingForm title={t("policy.childPolicy")} lgWidth={12}>
        <NoMarginHelperText>{t("policy.loadBalanceDes")}</NoMarginHelperText>
        <LoadBalanceChildrenEditor
          value={children}
          onChange={(lb_children) => setPolicy({ ...policy, settings: { ...policy.settings, lb_children } })}
        />
        <NoMarginHelperText>{t("policy.childPolicyDes")}</NoMarginHelperText>
      </SettingForm>
      <Button variant="contained" color="primary" sx={{ mt: 2 }} disabled={children.length == 0} onClick={handleSubmit}>
        {t("policy.create")}
      </Button>
    </form>
  );
};

export default LoadBalanceWizard;
