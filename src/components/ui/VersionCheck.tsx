import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from "../ui/Dialog";
import { BowlSteam } from "@phosphor-icons/react";
import { version as currentVersion } from "../../../package.json";
import { Button } from "./Button";
import CustomMarkdown from "../CustomMarkdown";
import Skeleton from "./Skeleton";
export default function VersionChecker() {
    const [isOpen, setIsOpen] = useState(false);
    const [latestVersion, setLatestVersion] = useState<string | null>(null);
    const [changelog, setChangelog] = useState<string | null>(null);
    const [downloadUrls, setDownloadUrls] = useState<any>({});
    const [error, setError] = useState<string | null>(null);
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

    const fetchLatestVersion = useCallback(async () => {
        try {
            const response = await fetch(
                "https://api.github.com/repos/OpenMarch/OpenMarch/releases/latest",
            );
            const data = await response.json();
            if (data.tag_name) {
                setLatestVersion(data.tag_name);
                setChangelog(data.body);

                // Check if the installed version is outdated
                if (isNewerVersion(data.tag_name, currentVersion)) {
                    setIsUpdateAvailable(true);
                } else {
                    setIsUpdateAvailable(false);
                }

                // Find the download URLs for Windows, macOS, and Linux
                const assetUrls: any = {
                    windows: null,
                    mac: null,
                    linux: null,
                };

                data.assets.forEach((asset: any) => {
                    if (asset.name.endsWith(".exe")) {
                        assetUrls.windows = asset.browser_download_url;
                    } else if (asset.name.endsWith(".dmg")) {
                        assetUrls.mac = asset.browser_download_url;
                    } else if (
                        asset.name.endsWith(".AppImage") ||
                        asset.name.endsWith(".tar.gz")
                    ) {
                        assetUrls.linux = asset.browser_download_url;
                    }
                });

                setDownloadUrls(assetUrls);
            } else {
                setError("Unable to fetch latest version.");
            }
        } catch (err) {
            setError("An error occurred while fetching the version.");
        }
    }, []);

    useEffect(() => {
        fetchLatestVersion(); // Fetch the latest
    }, [fetchLatestVersion]);

    useEffect(() => {
        if (isUpdateAvailable) {
            setIsOpen(true);
        }
    }, [latestVersion, isUpdateAvailable]);

    /**
     * Compares two version strings and returns true if version A is newer than version B.
     * Versions should be in format "x.y.z" where x, y, z are numbers.
     *
     * @param versionA First version string to compare
     * @param versionB Second version string to compare
     * @returns boolean True if versionA is newer than versionB
     */
    function isNewerVersion(versionA: string, versionB: string): boolean {
        // Remove any leading 'v' if present
        const cleanVersionA = versionA.startsWith("v")
            ? versionA.substring(1)
            : versionA;
        const cleanVersionB = versionB.startsWith("v")
            ? versionB.substring(1)
            : versionB;

        // Split versions into components
        const componentsA = cleanVersionA.split(".").map(Number);
        const componentsB = cleanVersionB.split(".").map(Number);

        // Compare each component
        const maxLength = Math.max(componentsA.length, componentsB.length);

        for (let i = 0; i < maxLength; i++) {
            // Default to 0 if the component doesn't exist
            const valueA = i < componentsA.length ? componentsA[i] : 0;
            const valueB = i < componentsB.length ? componentsB[i] : 0;

            if (valueA > valueB) {
                return true;
            }

            if (valueA < valueB) {
                return false;
            }

            // If they're equal, continue to the next component
        }

        // If we get here, all components were equal
        return false;
    }

    function SettingsModalContents() {
        return (
            <div className="bg flex flex-col gap-48 p-16">
                <div className="flex flex-col gap-16">
                    <div className="flex w-full items-center justify-between gap-16">
                        {error ? (
                            <p className="text-body">{`Error: ${error}`}</p>
                        ) : latestVersion ? (
                            <h1 className="text-h1">
                                OpenMarch - {latestVersion}
                            </h1>
                        ) : (
                            <Skeleton className="h-64 w-[40%]" />
                        )}
                    </div>

                    {/* Displays the changelog if available */}
                    {changelog ? (
                        <div className="text-sm mt-4 max-h-[400px] overflow-auto">
                            <CustomMarkdown>{changelog}</CustomMarkdown>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-8">
                            <Skeleton className="h-128 w-[75%]" />
                            <Skeleton className="h-32" />
                            <Skeleton className="h-32" />
                        </div>
                    )}

                    <div className="mx-2 my-4 flex w-full justify-between">
                        {/* Show the install button only if an update is available */}
                        {isUpdateAvailable && downloadUrls.windows && (
                            <Button
                                onClick={() =>
                                    window.open(downloadUrls.windows, "_blank")
                                }
                            >
                                Install Latest Version for Windows
                            </Button>
                        )}

                        {isUpdateAvailable && downloadUrls.mac && (
                            <Button
                                onClick={() =>
                                    window.open(downloadUrls.mac, "_blank")
                                }
                            >
                                Install Latest Version for macOS
                            </Button>
                        )}

                        {isUpdateAvailable && downloadUrls.linux && (
                            <Button
                                onClick={() =>
                                    window.open(downloadUrls.linux, "_blank")
                                }
                            >
                                Install Latest Version for Linux
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger
                asChild
                className="titlebar-button flex cursor-pointer items-center gap-6 outline-none duration-150 ease-out hover:text-accent focus-visible:-translate-y-4 disabled:pointer-events-none disabled:opacity-50"
            >
                <BowlSteam size={18} />
            </DialogTrigger>
            <DialogContent className="w-[60rem] max-w-full">
                <DialogTitle>New Version Available!</DialogTitle>
                <SettingsModalContents />
            </DialogContent>
        </Dialog>
    );
}
