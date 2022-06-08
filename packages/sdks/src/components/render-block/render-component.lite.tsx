import { BuilderBlock } from '../../types/builder-block.js';
import BlockStyles from './block-styles.lite';
import RenderBlock from './render-block.lite';
import { For, Show } from '@builder.io/mitosis';

type Props = {
  componentRef: any;
  componentOptions: any;
  blockChildren: BuilderBlock[];
};

export default function RenderComponent(props: Props) {
  return (
    <Show when={props.componentRef}>
      <props.componentRef {...props.componentOptions}>
        <For each={props.blockChildren}>
          {(child) => (
            <RenderBlock key={'render-block-' + child.id} block={child} />
          )}
        </For>
        <For each={props.blockChildren}>
          {(child) => (
            <BlockStyles key={'block-style-' + child.id} block={child} />
          )}
        </For>
      </props.componentRef>
    </Show>
  );
}
