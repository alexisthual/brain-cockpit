import { Button, ButtonGroup } from "@blueprintjs/core";
import { IconName } from "@blueprintjs/icons";
import { Select } from "@blueprintjs/select";
import React from "react";

import { stringRenderer } from "constants/index";
import "./style.scss";

interface InfoPanelInput {
  value?: string | boolean;
  values?: string[];
  onChangeCallback?: any;
  iconActive?: IconName;
  iconInactive?: IconName;
  title?: string;
}

interface InfoPanelRow {
  label: string;
  inputs: InfoPanelInput[];
}

interface IProps {
  rows: InfoPanelRow[];
}

const InfoPanel = ({ rows }: IProps) => {
  return (
    <div className="info-panel">
      {rows.map((row: InfoPanelRow) => (
        <>
          <div className="header-item-label">{row.label}</div>
          <div className="header-item-value">
            <ButtonGroup>
              {row.inputs.map((input: InfoPanelInput) => (
                <>
                  {input.values ? (
                    <Select<string>
                      filterable={false}
                      items={input.values}
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
                  ) : input.onChangeCallback ? (
                    <Button
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
                      outlined
                      title={input.title}
                    />
                  ) : (
                    <>{input.value}</>
                  )}
                </>
              ))}
            </ButtonGroup>
          </div>
        </>
      ))}
    </div>
  );
};

export default InfoPanel;
