import { MenuItem, PopoverPosition } from "@blueprintjs/core";
import { MultiSelect2 } from "@blueprintjs/select";
import React, { useState } from "react";

import { highlightText } from "constants/index";

const stringPredicate = (query: string, item: string) => {
  return item.indexOf(query) > -1;
};

interface Props {
  selectedItems?: string[];
  items: string[];
  onItemSelect: (
    newSelectedItem: string,
    event?: React.SyntheticEvent<HTMLElement>
  ) => void;
  onRemove: (
    newSelectedItem: string,
    index: number,
    event?: React.SyntheticEvent<HTMLElement>
  ) => void;
}

const MultiSelectString = ({
  selectedItems,
  items,
  onItemSelect,
  onRemove,
}: Props) => {
  const [query, setQuery] = useState<string | undefined>(undefined);

  return (
    <MultiSelect2<string>
      selectedItems={selectedItems ?? []}
      className={"bp4-outlined"}
      items={items ?? []}
      itemPredicate={stringPredicate}
      itemRenderer={(item, { modifiers, handleClick, query }) => {
        if (!modifiers.matchesPredicate) {
          return null;
        }
        return (
          <MenuItem
            active={modifiers.active}
            icon={selectedItems?.indexOf(item) !== -1 ? "tick" : "blank"}
            key={item}
            onClick={handleClick}
            text={highlightText(item, query)}
            shouldDismissPopover={false}
          />
        );
      }}
      onItemSelect={(
        newItem: string,
        event?: React.SyntheticEvent<HTMLElement>
      ) => {
        if (onItemSelect) {
          onItemSelect(newItem, event);
        }
      }}
      onRemove={(
        newItem: string,
        index: number,
        event?: React.SyntheticEvent<HTMLElement>
      ) => {
        if (onRemove) {
          onRemove(newItem, index, event);
        }
      }}
      popoverProps={{
        minimal: false,
        position: PopoverPosition.TOP,
      }}
      query={query}
      onQueryChange={(newQuery: string) => {
        setQuery(newQuery);
      }}
      tagInputProps={{
        tagProps: { minimal: true },
      }}
      tagRenderer={(label: string) => label}
    />
  );
};

export default MultiSelectString;
