import { useEffect, useState } from "react";

import FingerprintPane from "components/pane/fingerprint";
import AlignmentControls from "./alignmentControls";
import AlignmentPane from "./alignmentPane";
import {
  ContrastLabel,
  HemisphereSide,
  Orientation,
  MeshSupport,
  Model,
} from "constants/index";
import { server } from "App";

export enum ViewLayout {
  ALIGNMENT = "Alignment",
  CONTRAST = "Contrast",
}

export enum AlignmentRole {
  SOURCE = "source",
  TARGET = "target",
}

export enum AlignmentIntent {
  SINGLE_VOXEL = "single_voxel",
  ALIGNED_CONTRAST = "aligned_contrast",
  TRUE_CONTRAST = "true_contrast",
  ALIGNMENT_ERROR = "alignment_error",
}

export interface AlignmentViewState {
  model?: Model;
  meshSupport: MeshSupport;
  hemi: HemisphereSide;
  viewLayout: ViewLayout;
  contrast?: number;
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
//   const history = useNavigate();
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
    viewLayout: ViewLayout.ALIGNMENT,
    source: {
      subject: 5,
      selectedVoxel: 6680,
    },
    target: {
      subject: 7,
      selectedVoxel: undefined,
    },
  });

  // Label information
  const [subjectLabels, setSubjectLabels] = useState<string[]>([]);
  const [contrastLabels, setContrastLabels] = useState<ContrastLabel[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  // Page layout
  const [orientation, setOrientation] = useState(Orientation.VERTICAL);
  const [showGridHelper, setShowGridHelper] = useState(true);
  // Fingerprint
  const [selectedPaneId] = useState<string | undefined>(undefined);
  const [contrastFingerprint] = useState<number[]>([]);
  const [loadingFingerprint] = useState(false);
  // const [meanFingerprint, setMeanFingerprint] = useState(false);

  // Initialise all pane state variables
  useEffect(() => {
    const fetchAllData = async () => {
      // Load static data
      const subjectLabels = server.get<string[]>("/ibc/subjects");
      const contrastLabels = server.get<string[][]>("/ibc/contrast_labels");
      const modelLabels = server.get<any>("/alignments/models");

      // Wait for all data to be loaded before setting app state
      Promise.all([subjectLabels, contrastLabels, modelLabels]).then(
        (values) => {
          setSubjectLabels(values[0].data);

          // Parse contrasts
          const contrastLabels = values[1].data.map((label: any) => ({
            task: label[0],
            contrast: label[1],
          }));
          setContrastLabels(contrastLabels);
          // Set current contrast to first contrast of list
          if (contrastLabels.length > 0) {
            setState((state: AlignmentViewState) => {
              return {
                ...state,
                contrast: 0,
              };
            });
          }

          let models: Model[] = [];
          // console.log(values[2].data);
          for (const key in values[2].data) {
            models.push({
              ...values[2].data[key],
              name: key,
            });
          }
          // console.log(models);
          setModels(models);
          if (models.length > 0) {
            setState((state: AlignmentViewState) => {
              return {
                ...state,
                model: models[0],
              };
            });
          }
        }
      );
    };

    fetchAllData();
  }, []);

  let panes = null;

  switch (state.viewLayout) {
    case ViewLayout.ALIGNMENT:
      panes = (
        <>
          <div className="scene-row">
            <AlignmentPane
              alignmentState={state}
              setAlignmentState={setState}
              paneRole={AlignmentRole.SOURCE}
              paneIntent={AlignmentIntent.SINGLE_VOXEL}
              subjectLabels={subjectLabels}
              showGridHelper={showGridHelper}
              colormapName={"viridis"}
              paneLabel={"SOURCE SUBJECT"}
            />
            <AlignmentPane
              alignmentState={state}
              setAlignmentState={setState}
              paneRole={AlignmentRole.TARGET}
              paneIntent={AlignmentIntent.SINGLE_VOXEL}
              subjectLabels={subjectLabels}
              showGridHelper={showGridHelper}
              colormapName={"viridis"}
              paneLabel={"TARGET SUBJECT"}
            />
          </div>
        </>
      );
      break;
    case ViewLayout.CONTRAST:
      panes = (
        <>
          <div className="scene-row">
            <div className="scene-row-label">SOURCE SUBJECT</div>
            <AlignmentPane
              alignmentState={state}
              setAlignmentState={setState}
              paneRole={AlignmentRole.SOURCE}
              paneIntent={AlignmentIntent.TRUE_CONTRAST}
              subjectLabels={subjectLabels}
              showGridHelper={showGridHelper}
              colormapName={"diverging_temperature"}
              paneLabel={"ORIGINAL CONTRAST"}
            />
            <AlignmentPane
              alignmentState={state}
              setAlignmentState={setState}
              paneRole={AlignmentRole.SOURCE}
              paneIntent={AlignmentIntent.ALIGNED_CONTRAST}
              subjectLabels={subjectLabels}
              showGridHelper={showGridHelper}
              colormapName={"diverging_temperature"}
              paneLabel={"TRANSFORMED CONTRAST"}
            />
          </div>
          <div className="scene-row">
            <div className="scene-row-label">TARGET SUBJECT</div>
            <AlignmentPane
              alignmentState={state}
              setAlignmentState={setState}
              paneRole={AlignmentRole.TARGET}
              paneIntent={AlignmentIntent.TRUE_CONTRAST}
              subjectLabels={subjectLabels}
              showGridHelper={showGridHelper}
              colormapName={"diverging_temperature"}
            />
            <AlignmentPane
              alignmentState={state}
              setAlignmentState={setState}
              paneRole={AlignmentRole.TARGET}
              paneIntent={AlignmentIntent.ALIGNED_CONTRAST}
              subjectLabels={subjectLabels}
              showGridHelper={showGridHelper}
              colormapName={"diverging_temperature"}
            />
          </div>
        </>
      );
      break;
    default:
      panes = <div>invalid viewLayout</div>;
      break;
  }

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
          models={models}
          changeModelCallback={(newModel: Model) => {
            setState({
              ...state,
              model: newModel,
            });
          }}
          viewLayout={state.viewLayout}
          changeViewLayout={(newViewLayout: ViewLayout) => {
            setState({
              ...state,
              viewLayout: newViewLayout,
            });
          }}
          contrast={
            state.contrast !== undefined
              ? contrastLabels[state.contrast]
              : undefined
          }
          contrastLabels={contrastLabels}
          changeContrastLabel={(newContrastLabel: ContrastLabel) => {
            const newIndex = contrastLabels.indexOf(newContrastLabel);
            setState({
              ...state,
              contrast: newIndex,
            });
          }}
        />
        <div className="scene-panes">{panes}</div>
      </div>
      {selectedPaneId !== undefined ? (
        <FingerprintPane
          fingerprints={[contrastFingerprint]}
          loading={loadingFingerprint}
          contrastLabels={contrastLabels}
          closeCallback={() => {
            // do nothing
          }}
          orientation={orientation}
          setOrientation={setOrientation}
        />
      ) : null}
    </div>
  );
};

export default AlignmentsExplorer;
