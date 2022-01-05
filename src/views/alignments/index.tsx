import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { AxiosResponse } from "axios";
import { nanoid } from "nanoid";
import React, { useCallback, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import * as qs from "qs";

import ContrastFingerprint from "components/contrastFingerprint";
import PaneControls from "components/paneControls/buttons";
import AlignmentControls from "./alignmentControls";
import AlignmentPane from "./alignmentPane";
import {
  ContrastLabel,
  HemisphereSide,
  Orientation,
  MeshSupport,
  modulo,
} from "constants/index";
import { server } from "App";

export interface AlignmentViewState {
  model?: string;
  meshSupport: MeshSupport;
  hemi: HemisphereSide;
  source: {
    subject: number;
    selectedVoxel?: number;
  };
  target: {
    subject: number;
    selectedVoxel?: number;
  };
}

// interface SurfaceViewState {
//   panes: { [paneId: string]: SurfacePaneState };
// }
//
// // Custom hook to load state from URL
// const useSurfaceState = (): [
//   SurfaceViewState,
//   React.Dispatch<React.SetStateAction<SurfaceViewState>>
// ] => {
//   // Load state from URL and convert it to SurfaceViewState
//   // (decode booleans and numbers with custom decoder)
//   let urlState = qs.parse(window.location.search, {
//     ignoreQueryPrefix: true,
//     decoder(str, _, charset) {
//       const strWithoutPlus = str.replace(/\+/g, " ");
//       if (charset === "iso-8859-1") {
//         // unescape never throws, no try...catch needed:
//         return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
//       }
//
//       if (/^(\d+|\d*\.\d+)$/.test(str)) {
//         return parseFloat(str);
//       }
//
//       const keywords = {
//         true: true,
//         false: false,
//         null: null,
//         undefined,
//       } as any;
//
//       if (str in keywords) {
//         return keywords[str];
//       }
//
//       // utf-8
//       try {
//         return decodeURIComponent(strWithoutPlus);
//       } catch (e) {
//         return strWithoutPlus;
//       }
//     },
//   });
//   // as unknown) as SurfaceViewState;
//
//   // If no panes are present, create one with default state
//   if (urlState.panes === undefined) {
//     urlState = {
//       ...urlState,
//       panes: {
//         [nanoid()]: defaultPaneState,
//       },
//     };
//   }
//
//   // Instantiate new state
//   const [state, setState] = useState<any>(urlState);
//
//   // Update URL on state change
//   const history = useHistory();
//
//   useEffect(() => {
//     history.push({
//       search: qs.stringify(state),
//     });
//   }, [state, history]);
//
//   return [state, setState];
// };

//
// Alignment explorer
//

const AlignmentsExplorer = () => {
  // Load state from url
  // const [state, setState] = useSurfaceState();

  //
  // Keyboard events
  //

  // N
  // const keyAddPane = useCallback(
  //   (event: any) => {
  //     if (event.isComposing || event.keyCode === 78) {
  //       addPane();
  //     }
  //   },
  //   [addPane]
  // );
  //
  // useEffect(() => {
  //   window.addEventListener("keydown", keyAddPane);
  //   return () => {
  //     window.removeEventListener("keydown", keyAddPane);
  //   };
  // }, [keyAddPane]);

  // Alignment state
  const [state, setState] = useState<AlignmentViewState>({
    model: undefined,
    meshSupport: MeshSupport.FSAVERAGE5,
    hemi: HemisphereSide.LEFT,
    source: {
      subject: 0,
      selectedVoxel: 0,
    },
    target: {
      subject: 1,
      selectedVoxel: undefined,
    },
  });

  // Label information
  const [subjectLabels, setSubjectLabels] = useState<string[]>([]);
  const [contrastLabels, setContrastLabels] = useState<ContrastLabel[]>([]);
  const [modelLabels, setModelLabels] = useState<string[]>([]);
  // Page layout
  const [orientation, setOrientation] = useState(Orientation.VERTICAL);
  const [showGridHelper, setShowGridHelper] = useState(true);
  // Fingerprint
  const [selectedPaneId, setSelectedPaneId] = useState<string | undefined>(
    undefined
  );
  const [contrastFingerprint, setContrastFingerprint] = useState<number[]>([]);
  const [loadingFingerprint, setLoadingFingerprint] = useState(false);
  // const [meanFingerprint, setMeanFingerprint] = useState(false);

  // Initialise all pane state variables
  useEffect(() => {
    const fetchAllData = async () => {
      // Load static data
      const subjectLabels = server.get<string[]>("/ibc/subjects");
      const contrastLabels = server.get<string[][]>("/ibc/contrast_labels");
      const modelLabels = server.get<string[]>("/alignments/models");

      // Wait for all data to be loaded before setting app state
      Promise.all([subjectLabels, contrastLabels, modelLabels]).then(
        (values) => {
          setSubjectLabels(values[0].data);

          setContrastLabels(
            values[1].data.map((label: any) => ({
              task: label[0],
              contrast: label[1],
            }))
          );

          setModelLabels(values[2].data);
          if (values[2].data.length > 0) {
            setState({
              ...state,
              model: values[2].data[0],
            });
          }
        }
      );
    };

    fetchAllData();
  }, []);

  return (
    <div
      className={`main-container ${
        selectedPaneId !== undefined ? `${orientation}-orientation` : ""
      }`}
    >
      <div className="scenes">
        <AlignmentControls
          showGridHelper={showGridHelper}
          showGridHelperCallback={() => setShowGridHelper(!showGridHelper)}
          model={state.model}
          modelLabels={modelLabels}
          changeModelCallback={(newModel: string) => {
            const newState = {
              ...state,
              model: newModel,
            };

            setState(newState);
          }}
        />
        <div className="scene-panes">
          <AlignmentPane
            alignmentState={state}
            setAlignmentState={setState}
            paneRole={"source"}
            subjectLabels={subjectLabels}
            showGridHelper={showGridHelper}
          />
          <AlignmentPane
            alignmentState={state}
            setAlignmentState={setState}
            paneRole={"target"}
            subjectLabels={subjectLabels}
            showGridHelper={showGridHelper}
          />
        </div>
      </div>
      {selectedPaneId !== undefined ? (
        <div className="fingerprint">
          <PaneControls
            orientation={
              orientation === Orientation.VERTICAL
                ? Orientation.HORIZONTAL
                : Orientation.VERTICAL
            }
            orientationChangeCallback={() => {
              switch (orientation) {
                case Orientation.VERTICAL:
                  setOrientation(Orientation.HORIZONTAL);
                  break;
                case Orientation.HORIZONTAL:
                  setOrientation(Orientation.VERTICAL);
                  break;
              }
            }}
            clickCloseCallback={() => {
              setSelectedPaneId(undefined);
            }}
          />
          <ParentSize className="fingerprint-container" debounceTime={10}>
            {({ width: fingerprintWidth, height: fingerprintHeight }) => (
              <ContrastFingerprint
                loading={loadingFingerprint}
                orientation={
                  orientation === Orientation.VERTICAL
                    ? Orientation.HORIZONTAL
                    : Orientation.VERTICAL
                }
                contrastLabels={contrastLabels}
                fingerprint={contrastFingerprint}
                width={fingerprintWidth}
                height={fingerprintHeight}
              />
            )}
          </ParentSize>
        </div>
      ) : null}
    </div>
  );
};

export default AlignmentsExplorer;
