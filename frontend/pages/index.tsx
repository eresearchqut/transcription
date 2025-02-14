import Upload from "@/pages/transcription/upload";

export const getStaticProps = () => {
  return {
    props: {
      pageTitle: "Upload Media",
    },
  };
};

export default Upload;
