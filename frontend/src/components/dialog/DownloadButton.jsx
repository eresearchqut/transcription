import { Button } from "primereact/button";

export const DownloadButton = (props) => {
  const downloadText = () => {
    const linkElement = window.document.createElement("a");
    linkElement.href = window.URL.createObjectURL(new Blob([props.text()]));
    linkElement.download = "transcript.txt";
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
  };

  return (
    <Button
      label="Download transcription"
      icon="pi pi-download"
      onClick={downloadText}
    />
  );
};
