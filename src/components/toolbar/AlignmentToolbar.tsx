import { useUiSettingsStore } from "@/stores/uiSettings/useUiSettingsStore";
import { TbAxisX, TbAxisY, TbKeyframeAlignCenterFilled } from "react-icons/tb";
import { MdAlignHorizontalCenter, MdAlignVerticalCenter } from "react-icons/md";
import { RegisteredActionsObjects } from "@/utilities/RegisteredActionsHandler";
import { FaEllipsisH, FaEllipsisV } from "react-icons/fa";
import RegisteredActionButton from "../RegisteredActionButton";
import ToolbarSection from "./ToolbarSection";

export default function UiSettingsToolbar() {
    const { uiSettings } = useUiSettingsStore();

    return (
        <ToolbarSection aria-label="Alignment Toolbar">
            <div>
                <RegisteredActionButton
                    className={`rounded-none rounded-l ${uiSettings.lockX ? "btn-primary-appear-disabled" : "btn-primary"}`}
                    instructionalString={
                        uiSettings.lockX
                            ? RegisteredActionsObjects.lockX
                                  .instructionalStringToggleOff
                            : RegisteredActionsObjects.lockX
                                  .instructionalStringToggleOn
                    }
                    registeredAction={RegisteredActionsObjects.lockX}
                >
                    <TbAxisX />
                </RegisteredActionButton>
                <RegisteredActionButton
                    className={`rounded-none rounded-r ${uiSettings.lockY ? "btn-primary-appear-disabled" : "btn-primary"}`}
                    instructionalString={
                        uiSettings.lockY
                            ? RegisteredActionsObjects.lockY
                                  .instructionalStringToggleOff
                            : RegisteredActionsObjects.lockY
                                  .instructionalStringToggleOn
                    }
                    registeredAction={RegisteredActionsObjects.lockY}
                >
                    <TbAxisY />
                </RegisteredActionButton>
            </div>
            <div>
                <RegisteredActionButton
                    className="btn-primary rounded-md"
                    registeredAction={
                        RegisteredActionsObjects.snapToNearestWhole
                    }
                >
                    <TbKeyframeAlignCenterFilled />
                </RegisteredActionButton>
            </div>
            <div>
                <RegisteredActionButton
                    className="btn-primary rounded-none rounded-l"
                    registeredAction={
                        RegisteredActionsObjects.setAllMarchersToPreviousPage
                    }
                >
                    Set all to prev
                </RegisteredActionButton>
                <RegisteredActionButton
                    className="btn-primary rounded-none rounded-r"
                    registeredAction={
                        RegisteredActionsObjects.setSelectedMarchersToPreviousPage
                    }
                >
                    Set selected to prev
                </RegisteredActionButton>
            </div>
            <div>
                <RegisteredActionButton
                    className="btn-primary rounded-none rounded-l"
                    registeredAction={RegisteredActionsObjects.alignVertically}
                >
                    <MdAlignVerticalCenter />
                </RegisteredActionButton>
                <RegisteredActionButton
                    className="btn-primary rounded-none"
                    registeredAction={
                        RegisteredActionsObjects.alignHorizontally
                    }
                >
                    <MdAlignHorizontalCenter />
                </RegisteredActionButton>
                <RegisteredActionButton
                    className="btn-primary rounded-none"
                    registeredAction={
                        RegisteredActionsObjects.evenlyDistributeVertically
                    }
                >
                    <FaEllipsisV />
                </RegisteredActionButton>
                <RegisteredActionButton
                    className="btn-primary rounded-none rounded-r"
                    registeredAction={
                        RegisteredActionsObjects.evenlyDistributeHorizontally
                    }
                >
                    <FaEllipsisH />
                </RegisteredActionButton>
            </div>
        </ToolbarSection>
    );
}
