import { Storage } from "aws-amplify";
import { FileUpload } from "primereact/fileupload";
import { v4 as uuid } from "uuid";

export class S3FileUpload extends FileUpload {
  constructor(props) {
    super(props);
    this.upload = this.upload.bind(this);
    this.s3Uploadhandler = this.s3Uploadhandler.bind(this);
  }

  upload() {
    if (this.props.fileLimit) {
      this.uploadedFileCount += this.state.files.length;
    }

    this.s3Uploadhandler({
      files: this.state.files,
    });
  }

  async s3Uploadhandler(e) {
    for (const file of e.files) {
      this.setState({ progress: 0 });
      try {
        await Storage.put(`${this.props.uploadDir}/${uuid()}.upload`, file, {
          level: "private",
          metadata: {
            filename: encodeURIComponent(file.name),
            mimetype: file.type,
            filetype: "userUploadedFile",
            languagecode: "en-AU",
          },
          progressCallback: (progress) => {
            this.setState({
              progress: (progress.loaded * 100) / progress.total,
            });
          },
        });
        this.props.onUpload({ file: file });
      } catch (error) {
        console.log("Error uploading file: ", error);
        this.props.onError({ file: file, error: error });
      }
    }

    this.clear();
  }
}
