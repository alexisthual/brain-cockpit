import { Button, Colors, Icon, MenuItem } from "@blueprintjs/core";
import { Select } from "@blueprintjs/select";
import React, { useState } from "react";

import { ContrastLabel, contrastLabelToId } from "constants/index";

const contrastLabelToSpan = (label?: ContrastLabel) => {
  return label !== undefined ? (
    <span>
      <span className={"menu-item-category"}>{label.task}</span>
      <Icon icon="chevron-right" color={Colors.GRAY5} />
      <span>{label.contrast}</span>
    </span>
  ) : null;
};

const contrastLabelRenderer = (
  label: ContrastLabel,
  { handleClick, modifiers }: any
) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }

  return (
    <MenuItem
      key={`menu-item-${contrastLabelToId(label)}`}
      onClick={handleClick}
      text={contrastLabelToSpan(label)}
    />
  );
};

const contrastLabelPredicate = (query: string, item: ContrastLabel) => {
  return `${item.task}${item.contrast}`.indexOf(query) > -1;
};

interface Props {
  value: ContrastLabel;
  values: ContrastLabel[];
  onChangeCallback: (
    newContrastLabel: ContrastLabel,
    event?: React.SyntheticEvent<HTMLElement>
  ) => void;
}

const SelectContrastLabel = ({ value, values, onChangeCallback }: Props) => {
  const [contrastQuery, setContrastQuery] = useState<string | undefined>(
    undefined
  );

  return (
    <Select<ContrastLabel>
      itemPredicate={contrastLabelPredicate}
      itemRenderer={contrastLabelRenderer}
      items={values ?? []}
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
        text={contrastLabelToSpan(value)}
      />
    </Select>
  );
};

export default SelectContrastLabel;
