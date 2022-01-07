import { Button, ButtonGroup, Colors, Icon, Switch } from "@blueprintjs/core";
import { IconName } from "@blueprintjs/icons";
import { Select } from "@blueprintjs/select";
import React from "react";

import SelectContrastLabel from "components/select/selectContrastLabel";
import { ContrastLabel, stringRenderer } from "constants/index";
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
  label?: string;
  inputs: PaneControlsInput[];
}

interface IProps {
  rows: PaneControlsRow[];
}

const PaneControls = ({ rows }: IProps) => {
  return (
    <div className="pane-controls">
      {rows.map((row: PaneControlsRow, rowIndex: number) => (
        <div
          className="pane-controls-row"
          key={`pane-controls-row-${rowIndex}`}
        >
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
                        <Select<string>
                          key={`input-${inputIndex}`}
                          activeItem={input.value as string}
                          filterable={false}
                          items={input.values ?? []}
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
                            rightIcon="double-caret-vertical"
                            text={input.value}
                            minimal
                            outlined
                          />
                        </Select>
                      );
                      break;
                    case InputType.SELECT_CONTRAST:
                      element = (
                        <SelectContrastLabel
                          key={`input-${inputIndex}`}
                          values={input.values ?? []}
                          value={input.value as ContrastLabel}
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
