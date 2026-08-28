import type { ThemeConfig } from 'antd';
import { darken, isValidHex } from '../utils/color';

export const DEFAULT_BRAND_COLOR = '#1E5A46';

export function resolveBrandColor(couleurPrimaire?: string | null): string {
  return isValidHex(couleurPrimaire) ? couleurPrimaire : DEFAULT_BRAND_COLOR;
}

export function buildTheme(brandColor: string): ThemeConfig {
  const brandDark = darken(brandColor, 0.35);

  return {
    token: {
      colorPrimary: brandColor,

      colorSuccess: '#2F8F5B',
      colorWarning: '#C98A1D',
      colorError: '#C23B34',
      colorInfo: '#2C6FB0',

      colorText: '#1A1E1C',
      colorTextSecondary: '#4B534E',
      colorTextTertiary: '#838C86',
      colorBorder: '#D9DCD2',
      colorBorderSecondary: '#E7E9E2',
      colorBgLayout: '#F4F5F1',
      colorBgContainer: '#FFFFFF',

      borderRadius: 8,
      borderRadiusLG: 12,
      borderRadiusSM: 6,

      controlHeight: 38,

      fontFamily:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      fontSize: 14,
      fontSizeHeading1: 34,
      fontSizeHeading2: 26,
      fontSizeHeading3: 20,
      fontSizeHeading4: 16,
      fontSizeHeading5: 14,
      lineHeightHeading1: 1.25,
      lineHeightHeading2: 1.3,

      boxShadow: '0 2px 8px rgba(15, 61, 48, 0.06)',
      boxShadowSecondary: '0 4px 16px rgba(15, 61, 48, 0.08)',
    },
    components: {
      Button: {
        fontWeight: 600,
        controlHeight: 38,
        controlHeightLG: 44,
        borderRadius: 8,
        paddingInline: 18,
        primaryShadow: 'none',
        defaultShadow: 'none',
      },
      Card: {
        borderRadiusLG: 12,
        paddingLG: 24,
        headerFontSize: 16,
        headerFontSizeSM: 14,
      },
      Table: {
        headerBg: '#F4F5F1',
        headerColor: '#2B302D',
        headerSplitColor: '#E7E9E2',
        borderColor: '#E7E9E2',
        rowHoverBg: '#F2F7F5',
        cellPaddingBlock: 12,
        cellPaddingInline: 16,
        headerBorderRadius: 10,
      },
      Menu: {
        itemHoverBg: '#F4F5F1',
        itemHoverColor: '#1A1E1C',
        itemColor: '#4B534E',
        itemHeight: 44,
        itemBorderRadius: 8,
        itemMarginInline: 8,
        iconSize: 16,
        collapsedIconSize: 18,
      },
      Layout: {
        siderBg: '#FFFFFF',
        headerBg: '#FFFFFF',
        headerHeight: 72,
        headerPadding: '0 32px',
        bodyBg: '#F4F5F1',
        triggerBg: brandDark,
        triggerColor: '#FFFFFF',
      },
      Modal: {
        borderRadiusLG: 12,
        titleFontSize: 18,
        headerBg: '#FFFFFF',
      },
      Breadcrumb: {
        itemColor: '#4B534E',
        lastItemColor: '#1A1E1C',
        separatorColor: '#838C86',
      },
      Dropdown: { borderRadiusLG: 10 },
      Notification: { borderRadiusLG: 12 },
      Message: { borderRadiusLG: 8 },
    },
  };
}
