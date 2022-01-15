import { Classes, Dialog, Icon } from "@blueprintjs/core";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const KeyDialog = ({ isOpen, onClose }: Props) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={"Dataset viewer shortcuts"}
    >
      <div className={Classes.DIALOG_BODY}>
        <div className="bp4-hotkey-column">
          <h4 className="bp4-heading">Global shortcuts</h4>

          <div className="bp4-hotkey">
            <div className="bp4-hotkey-label">Apply changes to all panes</div>
            <span className="bp4-key-combo">
              <kbd className="bp4-key bp4-modifier-key">
                <Icon icon="key-option" />
                ALT
              </kbd>
              <kbd className="bp4-key">key or click</kbd>
            </span>
          </div>

          <div className="bp4-hotkey">
            <div className="bp4-hotkey-label">Select multiple voxels</div>
            <span className="bp4-key-combo">
              <kbd className="bp4-key bp4-modifier-key">
                <Icon icon="key-shift" />
                SHIFT
              </kbd>
              <kbd className="bp4-key">click</kbd>
            </span>
          </div>

          <div className="bp4-hotkey">
            <div className="bp4-hotkey-label">Add new pane</div>
            <span className="bp4-key-combo">
              <kbd className="bp4-key">N</kbd>
            </span>
          </div>

          <div className="bp4-hotkey">
            <div className="bp4-hotkey-label">Toggle this help dialog</div>
            <span className="bp4-key-combo">
              <kbd className="bp4-key">?</kbd>
            </span>
          </div>

          <h4 className="bp4-heading">Shortcuts specific to hovered pane</h4>

          <div className="bp4-hotkey">
            <div className="bp4-hotkey-label">Toggle contrast description</div>
            <span className="bp4-key-combo">
              <kbd className="bp4-key">O</kbd>
            </span>
          </div>

          <div className="bp4-hotkey">
            <div className="bp4-hotkey-label">Next subject</div>
            <span className="bp4-key-combo">
              <kbd className="bp4-key">I</kbd>
            </span>
          </div>

          <div className="bp4-hotkey">
            <div className="bp4-hotkey-label">Previous subject</div>
            <span className="bp4-key-combo">
              <kbd className="bp4-key">K</kbd>
            </span>
          </div>

          <div className="bp4-hotkey">
            <div className="bp4-hotkey-label">Next contrast</div>
            <span className="bp4-key-combo">
              <kbd className="bp4-key">L</kbd>
            </span>
          </div>

          <div className="bp4-hotkey">
            <div className="bp4-hotkey-label">Previous contrast</div>
            <span className="bp4-key-combo">
              <kbd className="bp4-key">J</kbd>
            </span>
          </div>

          <div className="bp4-hotkey">
            <div className="bp4-hotkey-label">Toggle mean of subjects</div>
            <span className="bp4-key-combo">
              <kbd className="bp4-key">U</kbd>
            </span>
          </div>

          <div className="bp4-hotkey">
            <div className="bp4-hotkey-label">Lateral view</div>
            <span className="bp4-key-combo">
              <kbd className="bp4-key">S</kbd>
            </span>
          </div>

          <div className="bp4-hotkey">
            <div className="bp4-hotkey-label">Medial view</div>
            <span className="bp4-key-combo">
              <kbd className="bp4-key">F</kbd>
            </span>
          </div>

          <div className="bp4-hotkey">
            <div className="bp4-hotkey-label">Anterior view</div>
            <span className="bp4-key-combo">
              <kbd className="bp4-key">E</kbd>
            </span>
          </div>

          <div className="bp4-hotkey">
            <div className="bp4-hotkey-label">Posterior view</div>
            <span className="bp4-key-combo">
              <kbd className="bp4-key">D</kbd>
            </span>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default KeyDialog;
