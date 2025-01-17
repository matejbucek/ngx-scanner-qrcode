import { binarize } from "./binarizer";
import { decode } from "./decoder/decoder";
import { extract } from "./extractor";
import { locate } from "./locator";
function scan(matrix) {
    const locations = locate(matrix);
    if (!locations) {
        return null;
    }
    for (const location of locations) {
        const extracted = extract(matrix, location);
        const decoded = decode(extracted.matrix);
        if (decoded) {
            return {
                binaryData: decoded.bytes,
                data: decoded.text,
                chunks: decoded.chunks,
                version: decoded.version,
                location: {
                    topRightCorner: extracted.mappingFunction(location.dimension, 0),
                    topLeftCorner: extracted.mappingFunction(0, 0),
                    bottomRightCorner: extracted.mappingFunction(location.dimension, location.dimension),
                    bottomLeftCorner: extracted.mappingFunction(0, location.dimension),
                    topRightFinderPattern: location.topRight,
                    topLeftFinderPattern: location.topLeft,
                    bottomLeftFinderPattern: location.bottomLeft,
                    bottomRightAlignmentPattern: location.alignmentPattern,
                },
            };
        }
    }
    return null;
}
const defaultOptions = {
    inversionAttempts: "attemptBoth",
};
function jsQR(data, width, height, providedOptions = {}) {
    const options = defaultOptions;
    Object.keys(options || {}).forEach(opt => {
        options[opt] = providedOptions[opt] || options[opt];
    });
    const shouldInvert = options.inversionAttempts === "attemptBoth" || options.inversionAttempts === "invertFirst";
    const tryInvertedFirst = options.inversionAttempts === "onlyInvert" || options.inversionAttempts === "invertFirst";
    const { binarized, inverted } = binarize(data, width, height, shouldInvert);
    let result = scan(tryInvertedFirst ? inverted : binarized);
    if (!result && (options.inversionAttempts === "attemptBoth" || options.inversionAttempts === "invertFirst")) {
        result = scan(tryInvertedFirst ? binarized : inverted);
    }
    return result;
}
jsQR.default = jsQR;
export default jsQR;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9uZ3gtc2Nhbm5lci1xcmNvZGUvc3JjL2xpYi9xcmNvZGUvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGFBQWEsQ0FBQztBQUdyQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFFekMsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGFBQWEsQ0FBQztBQUNwQyxPQUFPLEVBQUMsTUFBTSxFQUFRLE1BQU0sV0FBVyxDQUFDO0FBcUJ4QyxTQUFTLElBQUksQ0FBQyxNQUFpQjtJQUM3QixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDakMsSUFBSSxDQUFDLFNBQVMsRUFBRTtRQUNkLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFFRCxLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRTtRQUNoQyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDekMsSUFBSSxPQUFPLEVBQUU7WUFDWCxPQUFPO2dCQUNMLFVBQVUsRUFBRSxPQUFPLENBQUMsS0FBSztnQkFDekIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO2dCQUNsQixNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07Z0JBQ3RCLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztnQkFDeEIsUUFBUSxFQUFFO29CQUNSLGNBQWMsRUFBRSxTQUFTLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO29CQUNoRSxhQUFhLEVBQUUsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUM5QyxpQkFBaUIsRUFBRSxTQUFTLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQztvQkFDcEYsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQztvQkFFbEUscUJBQXFCLEVBQUUsUUFBUSxDQUFDLFFBQVE7b0JBQ3hDLG9CQUFvQixFQUFFLFFBQVEsQ0FBQyxPQUFPO29CQUN0Qyx1QkFBdUIsRUFBRSxRQUFRLENBQUMsVUFBVTtvQkFFNUMsMkJBQTJCLEVBQUUsUUFBUSxDQUFDLGdCQUFnQjtpQkFDdkQ7YUFDRixDQUFDO1NBQ0g7S0FDRjtJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQU1ELE1BQU0sY0FBYyxHQUFZO0lBQzlCLGlCQUFpQixFQUFFLGFBQWE7Q0FDakMsQ0FBQztBQUVGLFNBQVMsSUFBSSxDQUFDLElBQXVCLEVBQUUsS0FBYSxFQUFFLE1BQWMsRUFBRSxrQkFBMkIsRUFBRTtJQUVqRyxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUM7SUFDL0IsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ3RDLE9BQWUsQ0FBQyxHQUFHLENBQUMsR0FBSSxlQUF1QixDQUFDLEdBQUcsQ0FBQyxJQUFLLE9BQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqRixDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsS0FBSyxhQUFhLElBQUksT0FBTyxDQUFDLGlCQUFpQixLQUFLLGFBQWEsQ0FBQztJQUNoSCxNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsS0FBSyxZQUFZLElBQUksT0FBTyxDQUFDLGlCQUFpQixLQUFLLGFBQWEsQ0FBQztJQUNuSCxNQUFNLEVBQUMsU0FBUyxFQUFFLFFBQVEsRUFBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztJQUMxRSxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDM0QsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsS0FBSyxhQUFhLElBQUksT0FBTyxDQUFDLGlCQUFpQixLQUFLLGFBQWEsQ0FBQyxFQUFFO1FBQzNHLE1BQU0sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDeEQ7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBRUEsSUFBWSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7QUFDN0IsZUFBZSxJQUFJLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2JpbmFyaXplfSBmcm9tIFwiLi9iaW5hcml6ZXJcIjtcbmltcG9ydCB7Qml0TWF0cml4fSBmcm9tIFwiLi9CaXRNYXRyaXhcIjtcbmltcG9ydCB7Q2h1bmtzfSBmcm9tIFwiLi9kZWNvZGVyL2RlY29kZURhdGFcIjtcbmltcG9ydCB7ZGVjb2RlfSBmcm9tIFwiLi9kZWNvZGVyL2RlY29kZXJcIjtcbmltcG9ydCB7IFZlcnNpb24gfSBmcm9tIFwiLi9kZWNvZGVyL3ZlcnNpb25cIjtcbmltcG9ydCB7ZXh0cmFjdH0gZnJvbSBcIi4vZXh0cmFjdG9yXCI7XG5pbXBvcnQge2xvY2F0ZSwgUG9pbnR9IGZyb20gXCIuL2xvY2F0b3JcIjtcblxuZXhwb3J0IGludGVyZmFjZSBRUkNvZGUge1xuICBiaW5hcnlEYXRhOiBudW1iZXJbXTtcbiAgZGF0YTogc3RyaW5nO1xuICBjaHVua3M6IENodW5rcztcbiAgdmVyc2lvbjogbnVtYmVyO1xuICBsb2NhdGlvbjoge1xuICAgIHRvcFJpZ2h0Q29ybmVyOiBQb2ludDtcbiAgICB0b3BMZWZ0Q29ybmVyOiBQb2ludDtcbiAgICBib3R0b21SaWdodENvcm5lcjogUG9pbnQ7XG4gICAgYm90dG9tTGVmdENvcm5lcjogUG9pbnQ7XG5cbiAgICB0b3BSaWdodEZpbmRlclBhdHRlcm46IFBvaW50O1xuICAgIHRvcExlZnRGaW5kZXJQYXR0ZXJuOiBQb2ludDtcbiAgICBib3R0b21MZWZ0RmluZGVyUGF0dGVybjogUG9pbnQ7XG5cbiAgICBib3R0b21SaWdodEFsaWdubWVudFBhdHRlcm4/OiBQb2ludDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2NhbihtYXRyaXg6IEJpdE1hdHJpeCk6IFFSQ29kZSB8IG51bGwge1xuICBjb25zdCBsb2NhdGlvbnMgPSBsb2NhdGUobWF0cml4KTtcbiAgaWYgKCFsb2NhdGlvbnMpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGZvciAoY29uc3QgbG9jYXRpb24gb2YgbG9jYXRpb25zKSB7XG4gICAgY29uc3QgZXh0cmFjdGVkID0gZXh0cmFjdChtYXRyaXgsIGxvY2F0aW9uKTtcbiAgICBjb25zdCBkZWNvZGVkID0gZGVjb2RlKGV4dHJhY3RlZC5tYXRyaXgpO1xuICAgIGlmIChkZWNvZGVkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBiaW5hcnlEYXRhOiBkZWNvZGVkLmJ5dGVzLFxuICAgICAgICBkYXRhOiBkZWNvZGVkLnRleHQsXG4gICAgICAgIGNodW5rczogZGVjb2RlZC5jaHVua3MsXG4gICAgICAgIHZlcnNpb246IGRlY29kZWQudmVyc2lvbixcbiAgICAgICAgbG9jYXRpb246IHtcbiAgICAgICAgICB0b3BSaWdodENvcm5lcjogZXh0cmFjdGVkLm1hcHBpbmdGdW5jdGlvbihsb2NhdGlvbi5kaW1lbnNpb24sIDApLFxuICAgICAgICAgIHRvcExlZnRDb3JuZXI6IGV4dHJhY3RlZC5tYXBwaW5nRnVuY3Rpb24oMCwgMCksXG4gICAgICAgICAgYm90dG9tUmlnaHRDb3JuZXI6IGV4dHJhY3RlZC5tYXBwaW5nRnVuY3Rpb24obG9jYXRpb24uZGltZW5zaW9uLCBsb2NhdGlvbi5kaW1lbnNpb24pLFxuICAgICAgICAgIGJvdHRvbUxlZnRDb3JuZXI6IGV4dHJhY3RlZC5tYXBwaW5nRnVuY3Rpb24oMCwgbG9jYXRpb24uZGltZW5zaW9uKSxcblxuICAgICAgICAgIHRvcFJpZ2h0RmluZGVyUGF0dGVybjogbG9jYXRpb24udG9wUmlnaHQsXG4gICAgICAgICAgdG9wTGVmdEZpbmRlclBhdHRlcm46IGxvY2F0aW9uLnRvcExlZnQsXG4gICAgICAgICAgYm90dG9tTGVmdEZpbmRlclBhdHRlcm46IGxvY2F0aW9uLmJvdHRvbUxlZnQsXG5cbiAgICAgICAgICBib3R0b21SaWdodEFsaWdubWVudFBhdHRlcm46IGxvY2F0aW9uLmFsaWdubWVudFBhdHRlcm4sXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBPcHRpb25zIHtcbiAgaW52ZXJzaW9uQXR0ZW1wdHM/OiBcImRvbnRJbnZlcnRcIiB8IFwib25seUludmVydFwiIHwgXCJhdHRlbXB0Qm90aFwiIHwgXCJpbnZlcnRGaXJzdFwiO1xufVxuXG5jb25zdCBkZWZhdWx0T3B0aW9uczogT3B0aW9ucyA9IHtcbiAgaW52ZXJzaW9uQXR0ZW1wdHM6IFwiYXR0ZW1wdEJvdGhcIixcbn07XG5cbmZ1bmN0aW9uIGpzUVIoZGF0YTogVWludDhDbGFtcGVkQXJyYXksIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyLCBwcm92aWRlZE9wdGlvbnM6IE9wdGlvbnMgPSB7fSk6IFFSQ29kZSB8IG51bGwge1xuXG4gIGNvbnN0IG9wdGlvbnMgPSBkZWZhdWx0T3B0aW9ucztcbiAgT2JqZWN0LmtleXMob3B0aW9ucyB8fCB7fSkuZm9yRWFjaChvcHQgPT4geyAvLyBTYWQgaW1wbGVtZW50YXRpb24gb2YgT2JqZWN0LmFzc2lnbiBzaW5jZSB3ZSB0YXJnZXQgZXM1IG5vdCBlczZcbiAgICAob3B0aW9ucyBhcyBhbnkpW29wdF0gPSAocHJvdmlkZWRPcHRpb25zIGFzIGFueSlbb3B0XSB8fCAob3B0aW9ucyBhcyBhbnkpW29wdF07XG4gIH0pO1xuXG4gIGNvbnN0IHNob3VsZEludmVydCA9IG9wdGlvbnMuaW52ZXJzaW9uQXR0ZW1wdHMgPT09IFwiYXR0ZW1wdEJvdGhcIiB8fCBvcHRpb25zLmludmVyc2lvbkF0dGVtcHRzID09PSBcImludmVydEZpcnN0XCI7XG4gIGNvbnN0IHRyeUludmVydGVkRmlyc3QgPSBvcHRpb25zLmludmVyc2lvbkF0dGVtcHRzID09PSBcIm9ubHlJbnZlcnRcIiB8fCBvcHRpb25zLmludmVyc2lvbkF0dGVtcHRzID09PSBcImludmVydEZpcnN0XCI7XG4gIGNvbnN0IHtiaW5hcml6ZWQsIGludmVydGVkfSA9IGJpbmFyaXplKGRhdGEsIHdpZHRoLCBoZWlnaHQsIHNob3VsZEludmVydCk7XG4gIGxldCByZXN1bHQgPSBzY2FuKHRyeUludmVydGVkRmlyc3QgPyBpbnZlcnRlZCA6IGJpbmFyaXplZCk7XG4gIGlmICghcmVzdWx0ICYmIChvcHRpb25zLmludmVyc2lvbkF0dGVtcHRzID09PSBcImF0dGVtcHRCb3RoXCIgfHwgb3B0aW9ucy5pbnZlcnNpb25BdHRlbXB0cyA9PT0gXCJpbnZlcnRGaXJzdFwiKSkge1xuICAgIHJlc3VsdCA9IHNjYW4odHJ5SW52ZXJ0ZWRGaXJzdCA/IGJpbmFyaXplZCA6IGludmVydGVkKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4oanNRUiBhcyBhbnkpLmRlZmF1bHQgPSBqc1FSO1xuZXhwb3J0IGRlZmF1bHQganNRUjtcbiJdfQ==