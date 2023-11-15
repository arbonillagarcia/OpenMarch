import { useEffect, useState } from "react";
import { useMarcherStore } from "../../stores/Store";
import ListContainer from "./ListContainer";

function MarcherList() {
    const { marchers, fetchMarchers, marchersAreLoading, setMarchersAreLoading } = useMarcherStore();
    // eslint-disable-next-line
    const [headerRowAttributes, setHeaderRowAttributes] = useState<string[]>(["drill_number"]);
    const rowAttributeText = {
        drill_number: "Drill Number"
    }

    useEffect(() => {
        fetchMarchers().finally(() => {
            setMarchersAreLoading(false)
        });
    }, [fetchMarchers, setMarchersAreLoading]);

    return (
        <>
            <h2>Marchers</h2>
            <ListContainer
                isLoading={marchersAreLoading}
                attributes={headerRowAttributes}
                attributesText={rowAttributeText}
                content={marchers}
            />
        </>
    );
}

export default MarcherList;
