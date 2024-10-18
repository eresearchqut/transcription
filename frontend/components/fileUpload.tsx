import {
  ChangeEvent,
  FunctionComponent,
  MouseEvent,
  useRef,
  useState,
} from "react";
import { Button, ButtonProps } from "@chakra-ui/react";
import { v4 as uuidv4 } from "uuid";
import { Box } from "@chakra-ui/layout";

type FileUploadProps = {
  handleFile(file: File): void;
  label?: string;
  accepted?: string[];
  multiple?: boolean;
  buttonProps?: ButtonProps;
};

const FileUpload: FunctionComponent<FileUploadProps> = ({
  handleFile,
  label,
  accepted,
  multiple,

  buttonProps,
}) => {
  const [key, setKey] = useState<string>(uuidv4());
  const fileInput = useRef<HTMLInputElement | null>(null);
  const handleClick = (
    event: MouseEvent<HTMLDivElement | HTMLButtonElement>,
  ) => {
    fileInput.current?.click();
  };
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => handleFile(file));
    }
    setKey(uuidv4());
  };
  const defaultLabel = multiple ? "Upload Files" : "Upload File";
  const buttonLabel = label || defaultLabel;
  const accept = accepted?.join(",");

  return (
    <Box>
      <Button onClick={handleClick} {...buttonProps}>
        {buttonLabel}
      </Button>
      <input
        key={key}
        ref={fileInput}
        hidden={true}
        type={"file"}
        multiple={multiple || false}
        accept={accept}
        onChange={handleChange}
      />
    </Box>
  );
};

export default FileUpload;
