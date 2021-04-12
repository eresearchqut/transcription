import React, { useState } from 'react';
import { Button } from 'primereact/button';

export const ClipboardButton = (props) => {
    const [copied, setCopied] = useState(false);

    const copyText = () => {
        navigator.clipboard.writeText(props.text)
        setCopied(true);
    }
    const icon = copied ? "pi pi-check" : "pi pi-copy"

    return (
        <Button label="Copy to clipboard" icon={icon} onClick={copyText} />
    )
}

