import { useEffect, useState } from "react";

import FingerprintPane from "components/pane/fingerprint";
import AlignmentControls from "./alignmentControls";
import AlignmentPane from "./alignmentPane";
import { ContrastLabel, Orientation } from "constants/index";
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

export interface AlignmentViewProps {
  datasetId: string;
}

export interface AlignmentViewState {
  modelId: string;
  viewLayout: ViewLayout;
  contrast?: number;
  source: {
    selectedVoxel?: number;
    meshPath?: string;
  };
  target: {
    selectedVoxel?: number;
    meshPath?: string;
  };
}

//
// Alignment explorer
//

const AlignmentsExplorer = ({ datasetId }: AlignmentViewProps) => {
  // Alignment state
  const [state, setState] = useState<AlignmentViewState>({
    modelId: "0",
    viewLayout: ViewLayout.ALIGNMENT,
    source: {
      selectedVoxel: undefined,
    },
    target: {
      selectedVoxel: undefined,
    },
  });

  // Label information
  const [contrastLabels, setContrastLabels] = useState<ContrastLabel[]>([]);
  const [modelLabels, setModelLabels] = useState<string[]>([]);
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
      const contrastLabels = server.get<string[][]>(
        "/datasets/ibc/contrast_labels"
      );
      const modelLabels = server.get<string[]>(
        `/alignments/${datasetId}/models`
      );

      // Wait for all data to be loaded before setting app state
      Promise.all([contrastLabels, modelLabels]).then((values) => {
        // Parse contrasts
        const contrastLabels = values[0].data.map((label: any) => ({
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

        setModelLabels(values[1].data);
        if (values[1].data.length > 0) {
          setState((state: AlignmentViewState) => {
            return {
              ...state,
              model: values[1].data[0],
            };
          });
        }
      });
    };

    fetchAllData();
  }, [datasetId]);

  useEffect(() => {
    const modelInfo = server.get<any>(
      `/alignments/${datasetId}/${state.modelId}/info`
    );

    modelInfo
      .then((value) => {
        setState((state: AlignmentViewState) => {
          return {
            ...state,
            source: {
              ...state.source,
              meshPath: value.data["source_mesh"],
            },
            target: {
              ...state.target,
              meshPath: value.data["target_mesh"],
            },
          };
        });
      })
      .catch((error) => {
        console.log(error);
      });
  }, [datasetId, state.modelId]);

  let panes = null;

  switch (state.viewLayout) {
    case ViewLayout.ALIGNMENT:
      panes = (
        <>
          <div className="scene-row">
            <AlignmentPane
              datasetId={datasetId}
              alignmentState={state}
              setAlignmentState={setState}
              paneRole={AlignmentRole.SOURCE}
              paneIntent={AlignmentIntent.SINGLE_VOXEL}
              showGridHelper={showGridHelper}
              colormapName={"single_diverging_heat"}
              paneLabel={"SOURCE SUBJECT"}
            />
            <AlignmentPane
              datasetId={datasetId}
              alignmentState={state}
              setAlignmentState={setState}
              paneRole={AlignmentRole.TARGET}
              paneIntent={AlignmentIntent.SINGLE_VOXEL}
              showGridHelper={showGridHelper}
              colormapName={"single_diverging_heat"}
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
              datasetId={datasetId}
              alignmentState={state}
              setAlignmentState={setState}
              paneRole={AlignmentRole.SOURCE}
              paneIntent={AlignmentIntent.TRUE_CONTRAST}
              showGridHelper={showGridHelper}
              colormapName={"diverging_temperature"}
              paneLabel={"ORIGINAL CONTRAST"}
            />
            <AlignmentPane
              datasetId={datasetId}
              alignmentState={state}
              setAlignmentState={setState}
              paneRole={AlignmentRole.SOURCE}
              paneIntent={AlignmentIntent.ALIGNED_CONTRAST}
              showGridHelper={showGridHelper}
              colormapName={"diverging_temperature"}
              paneLabel={"TRANSFORMED CONTRAST"}
            />
          </div>
          <div className="scene-row">
            <div className="scene-row-label">TARGET SUBJECT</div>
            <AlignmentPane
              datasetId={datasetId}
              alignmentState={state}
              setAlignmentState={setState}
              paneRole={AlignmentRole.TARGET}
              paneIntent={AlignmentIntent.TRUE_CONTRAST}
              showGridHelper={showGridHelper}
              colormapName={"diverging_temperature"}
            />
            <AlignmentPane
              datasetId={datasetId}
              alignmentState={state}
              setAlignmentState={setState}
              paneRole={AlignmentRole.TARGET}
              paneIntent={AlignmentIntent.ALIGNED_CONTRAST}
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
          model={state.modelId}
          modelLabels={modelLabels}
          changeModelCallback={(newModel: string) => {
            setState({
              ...state,
              modelId: newModel,
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
