import {
  Button,
  ButtonGroup,
  Colors,
  Icon,
  MenuItem,
  Switch,
} from "@blueprintjs/core";
import { IconName } from "@blueprintjs/icons";
import { Select } from "@blueprintjs/select";
import React, { useState } from "react";

import {
  ContrastLabel,
  contrastLabelToId,
  stringRenderer,
} from "constants/index";
import "./style.scss";

export enum InputType {
  BUTTON = "button",
  LABEL = "label",
  SELECT_STRING = "select_string",
  SELECT_CONTRAST = "select_contrast",
  TWO_STATE_TOGGLE = "two_state_toggle",
}

interface PaneControlsInput {
  inputType: InputType;
  value?: string | ContrastLabel | boolean;
  values?: any[];
  onChangeCallback?: any;
  iconActive?: IconName;
  iconInactive?: IconName;
  title?: string;
  iconLeft?: IconName;
  iconRight?: IconName;
}

interface PaneControlsRow {
  label: string;
  inputs: PaneControlsInput[];
}

interface IProps {
  rows: PaneControlsRow[];
}

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
  { handleClick, modifiers, query }: any
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

const PaneControls = ({ rows }: IProps) => {
  const [contrastQuery, setContrastQuery] = useState<string | undefined>(
    undefined
  );

  return (
    <div className="pane-controls">
      {rows.map((row: PaneControlsRow, rowIndex: number) => (
        <div
          className="pane-controls-row"
          key={`pane-controls-row-${rowIndex}`}
        >
          <div className="header-item-label">{row.label}</div>
          <div className="header-item-value">
            <ButtonGroup>
              {row.inputs.map(
                (input: PaneControlsInput, inputIndex: number) => {
                  let element;
                  switch (input.inputType) {
                    case InputType.BUTTON:
                      element = (
                        <Button
                          key={`input-${inputIndex}`}
                          active={input.value as boolean | undefined}
                          icon={
                            input.value
                              ? input.iconActive
                              : input.iconInactive ?? input.iconActive
                          }
                          onClick={() => {
                            if (input.onChangeCallback) {
                              input.onChangeCallback();
                            }
                          }}
                          title={input.title}
                        />
                      );
                      break;
                    case InputType.TWO_STATE_TOGGLE:
                      element = (
                        <div
                          key={`input-${inputIndex}`}
                          className="custom-button two-state-toggle"
                        >
                          <Icon icon={input.iconLeft} />
                          <Switch
                            checked={input.value as boolean | undefined}
                            onChange={() => {
                              if (input.onChangeCallback) {
                                input.onChangeCallback();
                              }
                            }}
                          />
                          <Icon icon={input.iconRight} />
                        </div>
                      );
                      break;
                    case InputType.SELECT_STRING:
                      element = (
                        <Select<string>
                          key={`input-${inputIndex}`}
                          filterable={false}
                          items={input.values ?? []}
                          itemRenderer={stringRenderer}
                          onItemSelect={(newItem: string) => {
                            if (input.onChangeCallback) {
                              input.onChangeCallback(newItem);
                            }
                          }}
                        >
                          <Button
                            rightIcon="double-caret-vertical"
                            text={input.value}
                          />
                        </Select>
                      );
                      break;
                    case InputType.SELECT_CONTRAST:
                      element = (
                        <Select<ContrastLabel>
                          key={`input-${inputIndex}`}
                          itemPredicate={contrastLabelPredicate}
                          itemRenderer={contrastLabelRenderer}
                          items={input.values ?? []}
                          noResults={
                            <MenuItem disabled={true} text="No results." />
                          }
                          onItemSelect={(newItem: ContrastLabel) => {
                            if (input.onChangeCallback) {
                              input.onChangeCallback(newItem);
                            }
                          }}
                          onQueryChange={(query: string) => {
                            setContrastQuery(query);
                          }}
                          query={contrastQuery}
                        >
                          <Button
                            rightIcon="double-caret-vertical"
                            text={contrastLabelToSpan(
                              input.value as ContrastLabel
                            )}
                          />
                        </Select>
                      );
                      break;
                    case InputType.LABEL:
                      element = (
                        <span key={`input-${inputIndex}`}>{input.value}</span>
                      );
                      break;
                    default:
                      element = (
                        <span key={`input-${inputIndex}`}>{input.value}</span>
                      );
                      break;
                  }

                  return element;
                }
              )}
            </ButtonGroup>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PaneControls;
