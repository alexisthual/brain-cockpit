import { Button, ButtonGroup, Colors, Icon, Switch } from "@blueprintjs/core";
import { IconName } from "@blueprintjs/icons";
import { Tooltip2 } from "@blueprintjs/popover2";
import { Select2 } from "@blueprintjs/select";
import React from "react";

import MultiSelectString from "components/select/multiselectString";
import SelectContrastLabel from "components/select/selectContrastLabel";
import { ContrastLabel, stringRenderer } from "constants/index";
import "./style.scss";

export enum InputType {
  BUTTON = "button",
  LABEL = "label",
  SELECT_STRING = "select_string",
  SELECT_CONTRAST = "select_contrast",
  MULTISELECT_STRING = "multiselect_string",
  TWO_STATE_TOGGLE = "two_state_toggle",
}

interface PaneControlsInput {
  disabled?: boolean;
  inputType: InputType;
  value?: string | boolean;
  selectedItem?: string | ContrastLabel | boolean;
  selectedItems?: string[];
  items?: any[];
  onChangeCallback?: any;
  onClearCallback?: any;
  onRemoveCallback?: any;
  iconActive?: IconName;
  iconInactive?: IconName;
  title?: string;
  iconLeft?: IconName;
  iconRight?: IconName;
  tooltip?: string;
}

interface PaneControlsRow {
  label?: string;
  inputs: PaneControlsInput[];
}

interface IProps {
  fill?: boolean;
  rows: PaneControlsRow[];
}

const PaneControls = ({ fill, rows }: IProps) => {
  return (
    <div className="pane-controls">
      {rows.map((row: PaneControlsRow, rowIndex: number) => (
        <div
          className="pane-controls-row"
          key={`pane-controls-row-${rowIndex}`}
        >
          <div className="header-item-value">
            <ButtonGroup fill={fill}>
              {row.inputs.map(
                (input: PaneControlsInput, inputIndex: number) => {
                  let element;
                  switch (input.inputType) {
                    case InputType.BUTTON:
                      element = (
                        <Button
                          disabled={input.disabled}
                          key={`input-${inputIndex}`}
                          active={input.value as boolean | undefined}
                          icon={
                            input.value
                              ? input.iconActive
                              : input.iconInactive ?? input.iconActive
                          }
                          onClick={(event: React.MouseEvent<HTMLElement>) => {
                            if (input.onChangeCallback) {
                              input.onChangeCallback(event);
                            }
                          }}
                          title={input.title}
                          minimal
                          outlined
                        />
                      );
                      break;
                    case InputType.TWO_STATE_TOGGLE:
                      element = (
                        <div
                          key={`input-${inputIndex}`}
                          className="custom-button two-state-toggle"
                        >
                          <Icon
                            icon={input.iconLeft}
                            color={!input.value ? Colors.GRAY2 : Colors.GRAY5}
                          />
                          <Switch
                            checked={input.value as boolean | undefined}
                            onChange={(
                              event: React.FormEvent<HTMLInputElement>
                            ) => {
                              if (input.onChangeCallback) {
                                input.onChangeCallback(event);
                              }
                            }}
                          />
                          <Icon
                            icon={input.iconRight}
                            color={input.value ? Colors.GRAY2 : Colors.GRAY5}
                          />
                        </div>
                      );
                      break;
                    case InputType.SELECT_STRING:
                      element = (
                        <Select2<string>
                          key={`input-${inputIndex}`}
                          activeItem={input.selectedItem as string}
                          filterable={false}
                          items={input.items ?? []}
                          itemRenderer={stringRenderer}
                          onItemSelect={(
                            newItem: string,
                            event?: React.SyntheticEvent<HTMLElement>
                          ) => {
                            if (input.onChangeCallback) {
                              input.onChangeCallback(newItem, event);
                            }
                          }}
                        >
                          <Button
                            disabled={input.disabled}
                            rightIcon="double-caret-vertical"
                            text={input.selectedItem as string}
                            minimal
                            outlined
                          />
                        </Select2>
                      );
                      break;
                    case InputType.SELECT_CONTRAST:
                      element = (
                        <SelectContrastLabel
                          key={`input-${inputIndex}`}
                          selectedItem={input.selectedItem as ContrastLabel}
                          items={input.items ?? []}
                          onChangeCallback={(
                            newItem: ContrastLabel,
                            event?: React.SyntheticEvent<HTMLElement>
                          ) => {
                            if (input.onChangeCallback) {
                              input.onChangeCallback(newItem, event);
                            }
                          }}
                        />
                      );
                      break;
                    case InputType.MULTISELECT_STRING:
                      element = (
                        <MultiSelectString
                          key={`input-${inputIndex}`}
                          selectedItems={input.selectedItems}
                          items={input.items ?? []}
                          onClear={() => {
                            if (input.onClearCallback) {
                              input.onClearCallback();
                            }
                          }}
                          onItemSelect={(
                            newItem: string,
                            event?: React.SyntheticEvent<HTMLElement>
                          ) => {
                            if (input.onChangeCallback) {
                              input.onChangeCallback(newItem, event);
                            }
                          }}
                          onRemove={(
                            newItem: string,
                            index: number,
                            event?: React.SyntheticEvent<HTMLElement>
                          ) => {
                            if (input.onChangeCallback) {
                              input.onRemoveCallback(newItem, index, event);
                            }
                          }}
                        />
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

                  if (input.tooltip) {
                    element = (
                      <Tooltip2
                        content={input.tooltip}
                        placement={"right"}
                        key={`input-${inputIndex}`}
                      >
                        {element}
                      </Tooltip2>
                    );
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
