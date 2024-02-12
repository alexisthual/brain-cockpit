import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { useState } from "react";

import CloseButton from "components/buttons/closeButton";
import Fingerprint, { FingerprintFilter } from "components/fingerprint";
import OverlayLoader from "components/overlayLoader";
import PaneControls, { InputType } from "components/paneControls";
import { ContrastLabel, Orientation } from "constants/index";
import "./style.scss";

interface Props {
  fingerprints: number[][];
  loading?: boolean;
  contrastLabels: ContrastLabel[];
  selectedTasks?: string[];
  setSelectedTasks?: (newSelectedTasks: string[]) => void;
  filterSurface?: boolean;
  closeCallback: () => void;
  orientation?: Orientation;
  setOrientation?: (newOrientation: Orientation) => void;
  thresholdLow?: number;
  setThresholdLow?: (newValue: number) => void;
  thresholdHigh?: number;
  setThresholdHigh?: (newValue: number) => void;
}

const FingerprintPane = ({
  fingerprints,
  loading,
  contrastLabels,
  selectedTasks,
  setSelectedTasks = () => {},
  filterSurface,
  closeCallback,
  orientation,
  setOrientation = () => {},
  thresholdLow,
  setThresholdLow = () => {},
  thresholdHigh,
  setThresholdHigh = () => {},
}: Props) => {
  const [filter, setFilter] = useState(FingerprintFilter.ALL);
  const allTasks = [
    ...new Set(contrastLabels.map((label) => label.task)),
  ].sort();

  return (
    <div className="fingerprint-pane">
      {loading ? <OverlayLoader /> : null}
      <div className="fingerprint-controls">
        <CloseButton closeCallback={closeCallback} />
        <PaneControls
          fill={true}
          rows={[
            {
              inputs: [
                {
                  inputType: InputType.MULTISELECT_STRING,
                  selectedItems:
                    selectedTasks === undefined ? allTasks : selectedTasks,
                  items: allTasks,
                  onChangeCallback: (value: string) => {
                    const index = (selectedTasks ?? allTasks).indexOf(value);
                    // Add item if it's not already in list
                    // otherwise filter it out
                    if (index === -1) {
                      setSelectedTasks([...(selectedTasks ?? []), value]);
                    } else {
                      setSelectedTasks(
                        (selectedTasks ?? allTasks).filter(
                          (_t, i) => i !== index
                        )
                      );
                    }
                  },
                  onClearCallback: () => {
                    setSelectedTasks([allTasks[0]]);
                  },
                  onRemoveCallback: (_value: string, index: number) => {
                    if (index !== -1) {
                      setSelectedTasks(
                        (selectedTasks ?? allTasks).filter(
                          (_t, i) => i !== index
                        )
                      );
                    }
                  },
                },
                {
                  inputType: InputType.SELECT_STRING,
                  selectedItem: filter,
                  items: Object.keys(FingerprintFilter),
                  onChangeCallback: (newValue: string) => {
                    setFilter(
                      FingerprintFilter[
                        newValue as keyof typeof FingerprintFilter
                      ]
                    );
                  },
                  tooltip: "Contrasts / conditions",
                },
                {
                  inputType: InputType.BUTTON,
                  onChangeCallback: () => {
                    switch (orientation) {
                      case Orientation.VERTICAL:
                        setOrientation(Orientation.HORIZONTAL);
                        break;
                      case Orientation.HORIZONTAL:
                        setOrientation(Orientation.VERTICAL);
                        break;
                      default:
                        setOrientation(Orientation.HORIZONTAL);
                        break;
                    }
                  },
                  iconActive: "rotate-page",
                  tooltip: "Rotate pane",
                },
              ],
            },
          ]}
        />
      </div>
      <ParentSize
        className={`fingerprint-container ${orientation}-orientation`}
        debounceTime={10}
      >
        {({ width: fingerprintWidth, height: fingerprintHeight }) => (
          <Fingerprint
            filter={filter}
            selectedTasks={selectedTasks}
            clickedLabelCallback={(contrastIndex: number) => {
              // updatePaneKey(selectedPaneId, "contrast", contrastIndex);
            }}
            orientation={
              orientation === Orientation.VERTICAL
                ? Orientation.HORIZONTAL
                : Orientation.VERTICAL
            }
            contrastLabels={contrastLabels}
            fingerprints={fingerprints}
            width={fingerprintWidth}
            height={fingerprintHeight}
            thresholdLow={filterSurface ? thresholdLow : undefined}
            thresholdHigh={filterSurface ? thresholdHigh : undefined}
            thresholdLowHandleRelease={(newValue: number) =>
              setThresholdLow(newValue)
            }
            thresholdHighHandleRelease={(newValue: number) =>
              setThresholdHigh(newValue)
            }
          />
        )}
      </ParentSize>
    </div>
  );
};

export default FingerprintPane;
