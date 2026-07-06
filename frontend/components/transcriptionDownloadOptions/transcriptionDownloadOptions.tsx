import { Button, Stack, useBreakpointValue } from "@chakra-ui/react";
import { isUndefined } from "lodash";
import type { Transcription } from "model";
import { SUPPORTED_TRANSLATION_LANGUAGES as supportedTranslationLanguages } from "model";
import type { FunctionComponent } from "react";
import { languagesFromTranscription } from "@/components/transcriptionLanguages";
import {
  type TranscriptFormat,
  type TranscriptOptions,
  useDownload,
} from "../../hooks/useDownload";
import {
  type UseTranscriptionProps,
  useTranscription,
} from "../../hooks/useTranscription";
import { MappedIcon } from "../mappedIcon";
import {
  MenuContent,
  MenuItem,
  MenuItemGroup,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
  MenuTriggerItem,
} from "../ui/menu";
import { Tooltip } from "../ui/tooltip";

const mediaKey = (transcription: Transcription): string =>
  transcription.uploadEvent.object.key;

export interface DownloadOptionsProps
  extends Required<Pick<UseTranscriptionProps, "initialTranscription">> {
  handlePlayClick: (
    mediaUrl: string,
    transcriptUrl: string,
    summary?: string,
    languages?: (string | undefined)[],
    speakers?: string[],
  ) => void;
}

const filenameFromFormat = (transcription: Transcription, format: string) =>
  [transcription.metadata.filename.split(".")[0], format].join(".");

const languageDisplayName = (code: string) =>
  (supportedTranslationLanguages as Record<string, string>)[code] ?? code;

const transcriptProps = (
  transcription: Transcription,
  format: TranscriptFormat,
  options?: TranscriptOptions,
) => ({
  objectKey: transcription.downloadKey!,
  filename: filenameFromFormat(transcription, format),
  format,
  options,
});

const TRANSCRIPT_FORMATS: {
  format: TranscriptFormat;
  label: string;
  icon: string;
}[] = [
  { format: "txt", label: "Text (.txt)", icon: "readme" },
  { format: "srt", label: "SRT", icon: "subtitle" },
  { format: "vtt", label: "VTT", icon: "subtitle" },
  { format: "docx", label: "DOCX", icon: "docx" },
];

const DOWNLOAD_VARIANTS: {
  key: string;
  label: string;
  options: TranscriptOptions;
}[] = [
  {
    key: "plain",
    label: "Plain",
    options: { includeSpeakers: false, includeLanguages: false },
  },
  {
    key: "speakers",
    label: "With speakers",
    options: { includeSpeakers: true, includeLanguages: false },
  },
  {
    key: "languages",
    label: "With languages",
    options: { includeSpeakers: false, includeLanguages: true },
  },
  {
    key: "speakers-languages",
    label: "With speakers & languages",
    options: { includeSpeakers: true, includeLanguages: true },
  },
];

// Translations are a single target language, so the language-label variants
// would be identical to the plain/speaker ones; only offer those two.
const TRANSLATION_DOWNLOAD_VARIANTS = DOWNLOAD_VARIANTS.filter(
  (variant) => !variant.options.includeLanguages,
);

const MenuChevron = () => <MappedIcon icon={"chevron-down"} size={"xs"} />;

const PlayButtonContent = () => (
  <>
    <MappedIcon icon={"play-outline-square"} />
    Play
    <MenuChevron />
  </>
);

export const TranscriptionDownloadOptions: FunctionComponent<
  DownloadOptionsProps
> = ({ initialTranscription, handlePlayClick }) => {
  const {
    fetchMediaUrl,
    fetchTranscriptForPlayer,
    fetchTranslatedTranscriptUrl,
    downloadTranscript,
    downloadTranslatedTranscript,
    downloadFile,
  } = useDownload();
  const { transcription, summary } = useTranscription({
    jobId: initialTranscription.sk,
    initialTranscription,
  });

  // On narrow (mobile) screens a side-anchored sub-menu can overflow the
  // viewport, so open it below the trigger instead; keep the beside placement
  // on wider screens. `flip`/`slide`/`fitViewport` keep it on-screen either way.
  const submenuPlacement = useBreakpointValue({
    base: "bottom-start",
    sm: "left-start",
  } as const);
  const submenuPositioning = {
    placement: submenuPlacement,
    gutter: 2,
    flip: true,
    slide: true,
    overlap: true,
    fitViewport: true,
    overflowPadding: 8,
  };

  if (!transcription) return undefined;

  const targetLanguage = transcription.metadata.targetlanguage;
  const translationLanguageName = targetLanguage
    ? languageDisplayName(targetLanguage)
    : undefined;
  const translationLanguageLabel = translationLanguageName ?? "Translation";
  const originalLanguageNames = languagesFromTranscription(transcription);
  const originalLanguageLabel =
    originalLanguageNames && originalLanguageNames.length === 1
      ? `Original (${originalLanguageNames[0]})`
      : "Original transcript";
  const translatedFilename = (format: string) =>
    [
      transcription.metadata.filename.split(".")[0],
      targetLanguage,
      format,
    ].join(".");
  const playUnavailable = isUndefined(transcription.downloadKey);

  const loadPlayer = (
    transcript: Promise<{
      url: string;
      languages?: (string | undefined)[];
      speakers?: string[];
    }>,
  ) => {
    Promise.all([
      fetchMediaUrl(mediaKey(transcription), transcription.metadata.filename),
      transcript,
    ]).then(([mediaUrl, { url, languages, speakers }]) => {
      handlePlayClick(mediaUrl, url, summary, languages ?? [], speakers ?? []);
    });
  };

  const loadOriginalPlayer = () => {
    const { objectKey } = transcriptProps(transcription, "vtt");
    loadPlayer(fetchTranscriptForPlayer(objectKey));
  };

  const loadTranslatedPlayer = () => {
    loadPlayer(
      fetchTranslatedTranscriptUrl(transcription.translationKey!, "vtt", {
        includeSpeakers: false,
      }).then((url) => ({ url })),
    );
  };

  return (
    <Stack direction={{ base: "column", sm: "row" }}>
      <MenuRoot>
        <MenuTrigger asChild>
          <Button variant={"outline"} colorPalette={"blue"}>
            Download
            <MenuChevron />
          </Button>
        </MenuTrigger>
        <MenuContent>
          <MenuItemGroup>
            <MenuItem
              value={"media"}
              onClick={() =>
                downloadFile({
                  objectKey: mediaKey(transcription),
                  filename: transcription.metadata.filename,
                })
              }
            >
              <MappedIcon icon={"movie"} /> Media file
            </MenuItem>
          </MenuItemGroup>
          {(transcription.summaryKey || transcription.downloadKey) && (
            <MenuSeparator />
          )}
          {transcription.summaryKey && (
            <MenuItemGroup>
              <MenuItem
                value={"summary-txt"}
                onClick={() => {
                  downloadFile({
                    objectKey: transcription.summaryKey!,
                    filename: `Summary - ${filenameFromFormat(transcription, "txt")}`,
                  });
                }}
              >
                <MappedIcon icon={"readme"} /> Summary (.txt)
              </MenuItem>
            </MenuItemGroup>
          )}
          {transcription.summaryKey && transcription.downloadKey && (
            <MenuSeparator />
          )}
          {transcription.downloadKey && (
            <MenuItemGroup title={"Transcription"}>
              <MenuItem
                value={"json"}
                onClick={() =>
                  downloadFile({
                    objectKey: transcription.downloadKey!,
                    filename: filenameFromFormat(transcription, "json"),
                  })
                }
              >
                <MappedIcon icon={"json"} /> JSON
              </MenuItem>
              {TRANSCRIPT_FORMATS.map(({ format, label, icon }) => (
                <MenuRoot key={format} positioning={submenuPositioning}>
                  <MenuTriggerItem
                    value={format}
                    startIcon={<MappedIcon icon={icon} />}
                  >
                    {label}
                  </MenuTriggerItem>
                  <MenuContent>
                    <MenuItemGroup title={label}>
                      {DOWNLOAD_VARIANTS.map((variant) => (
                        <MenuItem
                          key={variant.key}
                          value={`${format}-${variant.key}`}
                          onClick={() =>
                            downloadTranscript(
                              transcriptProps(
                                transcription,
                                format,
                                variant.options,
                              ),
                            )
                          }
                        >
                          <MappedIcon icon={icon} /> {variant.label}
                        </MenuItem>
                      ))}
                    </MenuItemGroup>
                  </MenuContent>
                </MenuRoot>
              ))}
            </MenuItemGroup>
          )}
          {transcription.translationKey && (
            <>
              <MenuSeparator />
              <MenuItemGroup
                title={`Translation (${translationLanguageLabel})`}
              >
                {TRANSCRIPT_FORMATS.map(({ format, label, icon }) => (
                  <MenuRoot key={format} positioning={submenuPositioning}>
                    <MenuTriggerItem
                      value={`translation-${format}`}
                      startIcon={<MappedIcon icon={icon} />}
                    >
                      {label}
                    </MenuTriggerItem>
                    <MenuContent>
                      <MenuItemGroup title={label}>
                        {TRANSLATION_DOWNLOAD_VARIANTS.map((variant) => (
                          <MenuItem
                            key={variant.key}
                            value={`translation-${format}-${variant.key}`}
                            onClick={() =>
                              downloadTranslatedTranscript({
                                objectKey: transcription.translationKey!,
                                filename: translatedFilename(format),
                                format,
                                options: variant.options,
                              })
                            }
                          >
                            <MappedIcon icon={icon} /> {variant.label}
                          </MenuItem>
                        ))}
                      </MenuItemGroup>
                    </MenuContent>
                  </MenuRoot>
                ))}
              </MenuItemGroup>
            </>
          )}
        </MenuContent>
      </MenuRoot>
      {!playUnavailable ? (
        <MenuRoot>
          <MenuTrigger asChild>
            <Button variant={"solid"} colorPalette={"blue"}>
              <PlayButtonContent />
            </Button>
          </MenuTrigger>
          <MenuContent>
            <MenuItemGroup title={"Language"}>
              <MenuItem value={"original"} onClick={() => loadOriginalPlayer()}>
                <MappedIcon icon={"subtitle"} /> {originalLanguageLabel}
              </MenuItem>
              {transcription.translationKey && (
                <MenuItem
                  value={"translation"}
                  onClick={() => loadTranslatedPlayer()}
                >
                  <MappedIcon icon={"subtitle"} /> {translationLanguageLabel}
                </MenuItem>
              )}
            </MenuItemGroup>
          </MenuContent>
        </MenuRoot>
      ) : (
        <Tooltip
          content="This action is available once your transcription job has completed."
          disabled={!playUnavailable}
          positioning={{ placement: "left" }}
          portalled
        >
          <Button
            onClick={() =>
              transcription?.downloadKey ? loadOriginalPlayer() : undefined
            }
            variant={"solid"}
            colorPalette={"blue"}
            aria-disabled={playUnavailable}
          >
            <PlayButtonContent />
          </Button>
        </Tooltip>
      )}
    </Stack>
  );
};

export default TranscriptionDownloadOptions;
