import { Button, Colors, Icon, MenuItem } from "@blueprintjs/core";
import { Select2 } from "@blueprintjs/select";
import React, { useState } from "react";

import {
  ContrastLabel,
  contrastLabelToId,
  highlightText,
} from "constants/index";

const contrastLabelToSpan = (label?: ContrastLabel, query?: string) => {
  return label !== undefined ? (
    <span>
      <span className={"menu-item-category"}>
        {query !== undefined ? highlightText(label.task, query) : label.task}
      </span>
      <Icon icon="chevron-right" color={Colors.GRAY5} />
      <span>
        {query !== undefined
          ? highlightText(label.contrast, query)
          : label.contrast}
      </span>
    </span>
  ) : null;
};

const contrastLabelRenderer = (
  label: ContrastLabel,
  { handleClick, modifiers, query }: any
) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }

  return (
    <MenuItem
      key={`menu-item-${contrastLabelToId(label)}`}
      active={modifiers.active}
      onClick={handleClick}
      text={contrastLabelToSpan(label, query)}
    />
  );
};

const contrastLabelPredicate = (query: string, item: ContrastLabel) => {
  return (
    `${item.task.toLowerCase()}${item.contrast.toLowerCase()}`.indexOf(
      query.toLowerCase()
    ) >= 0
  );
};

interface Props {
  selectedItem: ContrastLabel;
  items: ContrastLabel[];
  onChangeCallback: (
    newContrastLabel: ContrastLabel,
    event?: React.SyntheticEvent<HTMLElement>
  ) => void;
}

const SelectContrastLabel = ({
  selectedItem,
  items,
  onChangeCallback,
}: Props) => {
  const [contrastQuery, setContrastQuery] = useState<string | undefined>(
    undefined
  );

  return (
    <Select2<ContrastLabel>
      activeItem={selectedItem}
      itemPredicate={contrastLabelPredicate}
      itemRenderer={contrastLabelRenderer}
      items={items ?? []}
      noResults={<MenuItem disabled={true} text="No results." />}
      onItemSelect={(
        newItem: ContrastLabel,
        event?: React.SyntheticEvent<HTMLElement>
      ) => {
        onChangeCallback(newItem, event);
      }}
      onQueryChange={(query: string) => {
        setContrastQuery(query);
      }}
      query={contrastQuery}
    >
      <Button
        rightIcon="double-caret-vertical"
        text={contrastLabelToSpan(selectedItem)}
        minimal
        outlined
      />
    </Select2>
  );
};

export default SelectContrastLabel;
