import { useSelectedMarcher } from "../../context/SelectedMarcherContext";
import { useSelectedPage } from "../../context/SelectedPageContext";
import { SingleMarcherPageDetails } from "./marcherPage/SingleMarcherPageDetails";
import { MarcherPageList } from "./marcherPage/MarcherPageList";
// import { useMarcherPageStore } from "../../stores/Store";

export function PageDetails() {
    const selectedPage = useSelectedPage()?.selectedPage || null;
    const selectedMarcher = useSelectedMarcher()?.selectedMarcher || null;
    // const { marcherPages, fetchMarcherPages } = useMarcherPageStore();

    return (
        <>
            <h2>Details</h2>
            <div className="list-container">
                {/* // Load a single marcherPage when both a marcher and page are selected */}
                {selectedMarcher && selectedPage ?
                    <SingleMarcherPageDetails />
                    // Load a list of marcherPages when only a marcher or page is selected
                    : selectedMarcher || selectedPage ?
                        <MarcherPageList />
                        : <p>no page or marcher selected</p>}
            </div>

        </>
    );
}
