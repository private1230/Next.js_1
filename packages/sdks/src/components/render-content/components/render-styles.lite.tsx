import { TARGET } from '../../../constants/target';
import { Fragment, Show, useMetadata, useState } from '@builder.io/mitosis';

interface CustomFont {
  family?: string;
  kind?: string;
  fileUrl?: string;
  files?: {
    [key: string]: string;
  };
}

interface Props {
  cssCode?: string;
  customFonts?: CustomFont[];
}

export default function RenderStyles(props: Props) {
  const state = useState({
    getCssFromFont(font: CustomFont) {
      // TODO: compute what font sizes are used and only load those.......
      const family =
        font.family +
        (font.kind && !font.kind.includes('#') ? ', ' + font.kind : '');
      const name = family.split(',')[0];
      const url = font.fileUrl ?? font?.files?.regular;
      let str = '';
      if (url && family && name) {
        str += `
  @font-face {
    font-family: "${family}";
    src: local("${name}"), url('${url}') format('woff2');
    font-display: fallback;
    font-weight: 400;
  }
          `.trim();
      }

      if (font.files) {
        for (const weight in font.files) {
          const isNumber = String(Number(weight)) === weight;
          if (!isNumber) {
            continue;
          }
          // TODO: maybe limit number loaded
          const weightUrl = font.files[weight];
          if (weightUrl && weightUrl !== url) {
            str += `
  @font-face {
    font-family: "${family}";
    src: url('${weightUrl}') format('woff2');
    font-display: fallback;
    font-weight: ${weight};
  }
            `.trim();
          }
        }
      }
      return str;
    },

    getFontCss({ customFonts }: { customFonts?: CustomFont[] }) {
      // TODO: flag for this
      // if (!this.builder.allowCustomFonts) {
      //   return '';
      // }
      // TODO: separate internal data from external
      return (
        customFonts?.map((font) => this.getCssFromFont(font))?.join(' ') || ''
      );
    },

    get injectedStyles(): string {
      return `
${props.cssCode || ''}
${state.getFontCss({ customFonts: props.customFonts })}`;
    },
    get injectedStyleScript(): string {
      // NOTE: we have to obfusctate the name of the tag due to a limitation in the svelte-preprocessor plugin.
      // https://github.com/sveltejs/vite-plugin-svelte/issues/315#issuecomment-1109000027
      return `<sty${''}le>${state.injectedStyles}</sty${''}le>`;
    },
  });

  return (
    <Show
      when={TARGET === 'svelte'}
      else={<style innerHTML={state.injectedStyles} />}
    >
      <Fragment innerHTML={state.injectedStyleScript} />
    </Show>
  );
}
