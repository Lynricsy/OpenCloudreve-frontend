import { Autocomplete, Box, createFilterOptions, debounce, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getSearchUser } from "../../../../api/api.ts";
import { User } from "../../../../api/user.ts";
import { useAppDispatch } from "../../../../redux/hooks.ts";
import { loadUserInfo } from "../../../../redux/thunks/session.ts";
import { NoLabelFilledTextField, NoWrapBox, NoWrapTypography } from "../../../Common/StyledComponents.tsx";
import UserAvatar from "../../../Common/User/UserAvatar.tsx";
import UserBadge from "../../../Common/User/UserBadge.tsx";
import { PropsContentProps } from "./CustomPropsItem.tsx";

// 用户搜索接口要求关键词至少 2 个字符
const minKeywordLength = 2;

const UserPropsContent = ({ prop, onChange, loading, readOnly, fullSize }: PropsContentProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [value, setValue] = useState(prop.value || "");
  const [selected, setSelected] = useState<User | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<readonly User[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setValue(prop.value || "");
  }, [prop.value]);

  // 已选值为用户 hashid，加载对应用户信息用于展示
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    if (selected?.id === value) {
      return;
    }
    let active = true;
    dispatch(loadUserInfo(value))
      .then((u) => {
        if (active) {
          setSelected(u);
        }
      })
      .catch(() => {
        if (active) {
          setSelected(null);
        }
      });
    return () => {
      active = false;
    };
  }, [value, dispatch]);

  const fetch = useMemo(
    () =>
      debounce((keyword: string, callback: (results?: readonly User[]) => void) => {
        setSearching(true);
        dispatch(getSearchUser(keyword))
          .then((results: readonly User[]) => callback(results))
          .catch(() => callback([]))
          .finally(() => setSearching(false));
      }, 300),
    [dispatch],
  );

  useEffect(() => {
    if (readOnly || inputValue.length < minKeywordLength || inputValue === selected?.nickname) {
      setOptions([]);
      return undefined;
    }

    let active = true;
    fetch(inputValue, (results?: readonly User[]) => {
      if (active) {
        setOptions(results ?? []);
      }
    });

    return () => {
      active = false;
    };
  }, [inputValue, fetch, readOnly, selected]);

  const filterOptions = useMemo(
    () =>
      createFilterOptions<User>({
        stringify: (option) => option.nickname + " " + (option.email ?? ""),
      }),
    [],
  );

  if (readOnly) {
    if (!value) {
      return null;
    }
    return <UserBadge uid={value} user={selected ?? undefined} textProps={{ variant: "body2" }} />;
  }

  const handleChange = (newValue: User | null) => {
    setSelected(newValue);
    const newId = newValue?.id ?? "";
    setValue(newId);
    if (newId !== (prop.value || "")) {
      onChange(newId);
    }
  };

  return (
    <Autocomplete<User>
      fullWidth
      size="small"
      value={selected}
      options={selected ? [selected, ...options.filter((o) => o.id !== selected.id)] : options}
      filterOptions={filterOptions}
      loading={searching}
      disabled={loading}
      blurOnSelect
      isOptionEqualToValue={(option, v) => option.id === v.id}
      getOptionLabel={(option) => option.nickname}
      noOptionsText={t("application:modals.noResults")}
      onChange={(_event, newValue) => handleChange(newValue)}
      onInputChange={(_event, newInputValue) => setInputValue(newInputValue)}
      onClick={(e) => e.stopPropagation()}
      renderOption={(optionProps, option) => {
        const { key, ...rest } = optionProps as typeof optionProps & { key: string };
        return (
          <li key={key} {...rest}>
            <Box sx={{ display: "flex", width: "100%", alignItems: "center" }}>
              <UserAvatar user={option} />
              <NoWrapBox sx={{ width: "100%", ml: 2 }}>
                <Typography variant="body2">{option.nickname}</Typography>
                {option.email && (
                  <NoWrapTypography variant="body2" color="text.secondary">
                    {option.email}
                  </NoWrapTypography>
                )}
              </NoWrapBox>
            </Box>
          </li>
        );
      }}
      renderInput={(params) => (
        <NoLabelFilledTextField
          {...params}
          variant="filled"
          fullSize={fullSize}
          placeholder={t("application:fileManager.clickToEditSelect")}
          slotProps={{
            input: {
              ...params.InputProps,
              disableUnderline: true,
              startAdornment: selected ? (
                <UserAvatar user={selected} sx={{ width: 20, height: 20, mr: 0.5 }} overwriteTextSize />
              ) : undefined,
            },
          }}
        />
      )}
    />
  );
};

export default UserPropsContent;
