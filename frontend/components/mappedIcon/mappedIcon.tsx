import React, {
  ComponentType,
  ForwardedRef,
  forwardRef,
  SVGProps,
} from "react";
import {
  FaCheckCircle,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationCircle,
  FaExternalLinkAlt,
  FaPhotoVideo,
  FaQuestion,
  FaReadme,
} from "react-icons/fa";
import { Icon, IconProps } from "@chakra-ui/react";
import { get, isEmpty } from "lodash";
import { AiOutlinePlaySquare } from "react-icons/ai";
import {
  TbClock,
  TbClockExclamation,
  TbFile,
  TbFileAlert,
  TbFileCheck,
} from "react-icons/tb";
import {
  MdChecklist,
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
  MdOutlineSearch,
  MdOutlineSubtitles,
} from "react-icons/md";
import { GoTriangleDown, GoTriangleUp } from "react-icons/go";
import { LuUpload } from "react-icons/lu";
import { FiPlus } from "react-icons/fi";
import { IoEnterOutline, IoExitOutline } from "react-icons/io5";
import { RiPlayList2Fill } from "react-icons/ri";
import { VscJson } from "react-icons/vsc";
import { HiMiniSparkles } from "react-icons/hi2";

const iconsMap: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  "check-circle": FaCheckCircle,
  "chevron-down": FaChevronDown,
  "chevron-left": FaChevronLeft,
  "chevron-right": FaChevronRight,
  clock: TbClock,
  "clock-exclamation": TbClockExclamation,
  "double-arrow-left": MdKeyboardDoubleArrowLeft,
  "double-arrow-right": MdKeyboardDoubleArrowRight,
  "enter-outline": IoEnterOutline,
  "exclamation-circle": FaExclamationCircle,
  "exit-outline": IoExitOutline,
  "external-link": FaExternalLinkAlt,
  file: TbFile,
  "file-check": TbFileCheck,
  "file-alert": TbFileAlert,
  generated: MdChecklist,
  json: VscJson,
  movie: FaPhotoVideo,
  "play-outline-square": AiOutlinePlaySquare,
  playlist: RiPlayList2Fill,
  plus: FiPlus,
  question: FaQuestion,
  readme: FaReadme,
  search: MdOutlineSearch,
  sparkle: HiMiniSparkles,
  subtitle: MdOutlineSubtitles,
  "triangle-down": GoTriangleDown,
  "triangle-up": GoTriangleUp,
  upload: LuUpload,
};

export interface MappedIconProps extends IconProps {
  icon: string;
  asIcon?: boolean;
}

// Wrap all components in iconsMap with React.forwardRef
const wrappedIconsMap = Object.fromEntries(
  Object.entries(iconsMap).map(([key, Component]) => [
    key,
    forwardRef((props, ref: ForwardedRef<SVGSVGElement>) => (
      <Component {...props} ref={ref} />
    )),
  ]),
);

export interface AccessibleIconProps extends IconProps {
  title?: string;
  children?: React.ReactNode;
}

const AccessibleIcon = forwardRef<SVGSVGElement, AccessibleIconProps>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (props: AccessibleIconProps, ref: ForwardedRef<SVGSVGElement>) => {
    const {
      "aria-label": ariaLabel,
      role,
      title,
      children,
      ...otherIconProps
    } = props;
    const isDecorative = isEmpty(ariaLabel) && isEmpty(title);
    const accessibleIconProps = {
      ...(isDecorative
        ? { "aria-label": undefined, role: undefined, "aria-hidden": true }
        : {
            "aria-label": ariaLabel,
            role: role ?? "img",
            "aria-hidden": false,
          }),
    };
    return (
      <Icon {...otherIconProps} {...accessibleIconProps}>
        {children}
      </Icon>
    );
  },
);

const WrappedIcon = forwardRef<SVGSVGElement, MappedIconProps>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ({ icon, ...props }, ref) => {
    const WrappedIconType = get(wrappedIconsMap, icon);
    return <WrappedIconType {...props} />;
  },
);

export const MappedIcon = forwardRef<SVGSVGElement, MappedIconProps>(
  function MappedIcon({ icon, asIcon = true, ...iconProps }, ref) {
    return asIcon ? (
      <AccessibleIcon {...iconProps}>
        <WrappedIcon icon={icon} ref={ref} />
      </AccessibleIcon>
    ) : (
      <WrappedIcon icon={icon} ref={ref} />
    );
  },
);

export default MappedIcon;
