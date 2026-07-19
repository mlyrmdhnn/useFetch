interface CustomLabelReturn {
  prev: {
    label: "";
    result: "";
  };
  next: {
    label: "";
    result: "";
  };
}

export interface ResolveLabelOptions {
  /**
   * Text will return Previous or Next
   * Arrow will return << or >>
   */
  arrowText?: "text" | "arrow";

  customLabel?: CustomLabelReturn;
}

export const resolveLabel = (
  label: string,
  options: ResolveLabelOptions = {},
) => {
  /**
   *  By default, if the label is &laquo and &raquo, it will return Previous and Next
   * @returns 'Previous/Next'
   */
  const { arrowText = "text", customLabel } = options;
  if (customLabel) {
    if (label == customLabel.prev.label) return customLabel.prev.result;
    if (label == customLabel.next.label) return customLabel.next.result;
  }

  if (arrowText == "text" && label.toLocaleLowerCase().includes("&laquo"))
    return "Previous";
  if (arrowText == "text" && label.toLocaleLowerCase().includes("&raquo"))
    return "Next";

  if (arrowText == "arrow" && label.toLocaleLowerCase().includes("&laquo"))
    return "<<";
  if (arrowText == "arrow" && label.toLocaleLowerCase().includes("&raquo"))
    return ">>";

  return label;
};
