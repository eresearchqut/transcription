import { useState } from "react";

import { Button } from "primereact/button";

export const ClipboardButton = (props) => {
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    navigator.clipboard.writeText(props.text());
    setCopied(true);

    setTimeout(() => setCopied(false), 3000);
  };

  const icon = copied ? "pi pi-check" : "pi pi-copy";
  const label = copied ? "Copied" : "Copy to clipboard";

  return <Button label={label} icon={icon} onClick={copyText} />;
};
