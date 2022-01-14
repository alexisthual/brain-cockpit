import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { useState } from "react";

import CloseButton from "components/buttons/closeButton";
import Fingerprint, { FingerprintFilter } from "components/fingerprint";
import OverlayLoader from "components/overlayLoader";
import PaneControls, { InputType } from "components/paneControls";
import { ContrastLabel, Orientation } from "constants/index";

interface Props {
  fingerprints: number[][];
  loading?: boolean;
  contrastLabels: ContrastLabel[];
  filterSurface?: boolean;
  closeCallback: () => void;
  orientation?: Orientation;
  setOrientation?: (newOrientation: Orientation) => void;
  lowThresholdMin?: number;
  setLowThresholdMin?: (newValue: number) => void;
  lowThresholdMax?: number;
  setLowThresholdMax?: (newValue: number) => void;
  highThresholdMin?: number;
  setHighThresholdMin?: (newValue: number) => void;
  highThresholdMax?: number;
  setHighThresholdMax?: (newValue: number) => void;
}

const FingerprintPane = ({
  fingerprints,
  loading,
  contrastLabels,
  filterSurface,
  closeCallback,
  orientation,
  setOrientation = () => {},
  lowThresholdMin,
  setLowThresholdMin = () => {},
  lowThresholdMax,
  setLowThresholdMax = () => {},
  highThresholdMin,
  setHighThresholdMin = () => {},
  highThresholdMax,
  setHighThresholdMax = () => {},
}: Props) => {
  const [filter, setFilter] = useState(FingerprintFilter.CONTRASTS);

  return (
    <div className="fingerprint">
      <CloseButton closeCallback={closeCallback} />
      {loading ? <OverlayLoader /> : null}
      <PaneControls
        rows={[
          {
            inputs: [
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
              },
            ],
          },
        ]}
      />
      <ParentSize className="fingerprint-container" debounceTime={10}>
        {({ width: fingerprintWidth, height: fingerprintHeight }) => (
          <Fingerprint
            filter={filter}
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
            lowThresholdMin={filterSurface ? lowThresholdMin : undefined}
            lowThresholdMax={filterSurface ? lowThresholdMax : undefined}
            highThresholdMin={filterSurface ? highThresholdMin : undefined}
            highThresholdMax={filterSurface ? highThresholdMax : undefined}
            lowHandleMinRelease={(newValue: number) =>
              setLowThresholdMin(newValue)
            }
            lowHandleMaxRelease={(newValue: number) =>
              setLowThresholdMax(newValue)
            }
            highHandleMinRelease={(newValue: number) =>
              setHighThresholdMin(newValue)
            }
            highHandleMaxRelease={(newValue: number) =>
              setHighThresholdMax(newValue)
            }
          />
        )}
      </ParentSize>
    </div>
  );
};

export default FingerprintPane;
