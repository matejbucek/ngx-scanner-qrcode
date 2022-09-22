const MAX_FINDERPATTERNS_TO_SEARCH = 4;
const MIN_QUAD_RATIO = 0.5;
const MAX_QUAD_RATIO = 1.5;
const distance = (a, b) => Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
function sum(values) {
    return values.reduce((a, b) => a + b);
}
// Takes three finder patterns and organizes them into topLeft, topRight, etc
function reorderFinderPatterns(pattern1, pattern2, pattern3) {
    // Find distances between pattern centers
    const oneTwoDistance = distance(pattern1, pattern2);
    const twoThreeDistance = distance(pattern2, pattern3);
    const oneThreeDistance = distance(pattern1, pattern3);
    let bottomLeft;
    let topLeft;
    let topRight;
    // Assume one closest to other two is B; A and C will just be guesses at first
    if (twoThreeDistance >= oneTwoDistance && twoThreeDistance >= oneThreeDistance) {
        [bottomLeft, topLeft, topRight] = [pattern2, pattern1, pattern3];
    }
    else if (oneThreeDistance >= twoThreeDistance && oneThreeDistance >= oneTwoDistance) {
        [bottomLeft, topLeft, topRight] = [pattern1, pattern2, pattern3];
    }
    else {
        [bottomLeft, topLeft, topRight] = [pattern1, pattern3, pattern2];
    }
    // Use cross product to figure out whether bottomLeft (A) and topRight (C) are correct or flipped in relation to topLeft (B)
    // This asks whether BC x BA has a positive z component, which is the arrangement we want. If it's negative, then
    // we've got it flipped around and should swap topRight and bottomLeft.
    if (((topRight.x - topLeft.x) * (bottomLeft.y - topLeft.y)) - ((topRight.y - topLeft.y) * (bottomLeft.x - topLeft.x)) < 0) {
        [bottomLeft, topRight] = [topRight, bottomLeft];
    }
    return { bottomLeft, topLeft, topRight };
}
// Computes the dimension (number of modules on a side) of the QR Code based on the position of the finder patterns
function computeDimension(topLeft, topRight, bottomLeft, matrix) {
    const moduleSize = (sum(countBlackWhiteRun(topLeft, bottomLeft, matrix, 5)) / 7 + // Divide by 7 since the ratio is 1:1:3:1:1
        sum(countBlackWhiteRun(topLeft, topRight, matrix, 5)) / 7 +
        sum(countBlackWhiteRun(bottomLeft, topLeft, matrix, 5)) / 7 +
        sum(countBlackWhiteRun(topRight, topLeft, matrix, 5)) / 7) / 4;
    if (moduleSize < 1) {
        throw new Error("Invalid module size");
    }
    const topDimension = Math.round(distance(topLeft, topRight) / moduleSize);
    const sideDimension = Math.round(distance(topLeft, bottomLeft) / moduleSize);
    let dimension = Math.floor((topDimension + sideDimension) / 2) + 7;
    switch (dimension % 4) {
        case 0:
            dimension++;
            break;
        case 2:
            dimension--;
            break;
    }
    return { dimension, moduleSize };
}
// Takes an origin point and an end point and counts the sizes of the black white run from the origin towards the end point.
// Returns an array of elements, representing the pixel size of the black white run.
// Uses a variant of http://en.wikipedia.org/wiki/Bresenham's_line_algorithm
function countBlackWhiteRunTowardsPoint(origin, end, matrix, length) {
    const switchPoints = [{ x: Math.floor(origin.x), y: Math.floor(origin.y) }];
    const steep = Math.abs(end.y - origin.y) > Math.abs(end.x - origin.x);
    let fromX;
    let fromY;
    let toX;
    let toY;
    if (steep) {
        fromX = Math.floor(origin.y);
        fromY = Math.floor(origin.x);
        toX = Math.floor(end.y);
        toY = Math.floor(end.x);
    }
    else {
        fromX = Math.floor(origin.x);
        fromY = Math.floor(origin.y);
        toX = Math.floor(end.x);
        toY = Math.floor(end.y);
    }
    const dx = Math.abs(toX - fromX);
    const dy = Math.abs(toY - fromY);
    let error = Math.floor(-dx / 2);
    const xStep = fromX < toX ? 1 : -1;
    const yStep = fromY < toY ? 1 : -1;
    let currentPixel = true;
    // Loop up until x == toX, but not beyond
    for (let x = fromX, y = fromY; x !== toX + xStep; x += xStep) {
        // Does current pixel mean we have moved white to black or vice versa?
        // Scanning black in state 0,2 and white in state 1, so if we find the wrong
        // color, advance to next state or end if we are in state 2 already
        const realX = steep ? y : x;
        const realY = steep ? x : y;
        if (matrix.get(realX, realY) !== currentPixel) {
            currentPixel = !currentPixel;
            switchPoints.push({ x: realX, y: realY });
            if (switchPoints.length === length + 1) {
                break;
            }
        }
        error += dy;
        if (error > 0) {
            if (y === toY) {
                break;
            }
            y += yStep;
            error -= dx;
        }
    }
    const distances = [];
    for (let i = 0; i < length; i++) {
        if (switchPoints[i] && switchPoints[i + 1]) {
            distances.push(distance(switchPoints[i], switchPoints[i + 1]));
        }
        else {
            distances.push(0);
        }
    }
    return distances;
}
// Takes an origin point and an end point and counts the sizes of the black white run in the origin point
// along the line that intersects with the end point. Returns an array of elements, representing the pixel sizes
// of the black white run. Takes a length which represents the number of switches from black to white to look for.
function countBlackWhiteRun(origin, end, matrix, length) {
    const rise = end.y - origin.y;
    const run = end.x - origin.x;
    const towardsEnd = countBlackWhiteRunTowardsPoint(origin, end, matrix, Math.ceil(length / 2));
    const awayFromEnd = countBlackWhiteRunTowardsPoint(origin, { x: origin.x - run, y: origin.y - rise }, matrix, Math.ceil(length / 2));
    const middleValue = towardsEnd.shift() + awayFromEnd.shift() - 1; // Substract one so we don't double count a pixel
    return awayFromEnd.concat(middleValue).concat(...towardsEnd);
}
// Takes in a black white run and an array of expected ratios. Returns the average size of the run as well as the "error" -
// that is the amount the run diverges from the expected ratio
function scoreBlackWhiteRun(sequence, ratios) {
    const averageSize = sum(sequence) / sum(ratios);
    let error = 0;
    ratios.forEach((ratio, i) => {
        error += (sequence[i] - ratio * averageSize) ** 2;
    });
    return { averageSize, error };
}
// Takes an X,Y point and an array of sizes and scores the point against those ratios.
// For example for a finder pattern takes the ratio list of 1:1:3:1:1 and checks horizontal, vertical and diagonal ratios
// against that.
function scorePattern(point, ratios, matrix) {
    try {
        const horizontalRun = countBlackWhiteRun(point, { x: -1, y: point.y }, matrix, ratios.length);
        const verticalRun = countBlackWhiteRun(point, { x: point.x, y: -1 }, matrix, ratios.length);
        const topLeftPoint = {
            x: Math.max(0, point.x - point.y) - 1,
            y: Math.max(0, point.y - point.x) - 1,
        };
        const topLeftBottomRightRun = countBlackWhiteRun(point, topLeftPoint, matrix, ratios.length);
        const bottomLeftPoint = {
            x: Math.min(matrix.width, point.x + point.y) + 1,
            y: Math.min(matrix.height, point.y + point.x) + 1,
        };
        const bottomLeftTopRightRun = countBlackWhiteRun(point, bottomLeftPoint, matrix, ratios.length);
        const horzError = scoreBlackWhiteRun(horizontalRun, ratios);
        const vertError = scoreBlackWhiteRun(verticalRun, ratios);
        const diagDownError = scoreBlackWhiteRun(topLeftBottomRightRun, ratios);
        const diagUpError = scoreBlackWhiteRun(bottomLeftTopRightRun, ratios);
        const ratioError = Math.sqrt(horzError.error * horzError.error +
            vertError.error * vertError.error +
            diagDownError.error * diagDownError.error +
            diagUpError.error * diagUpError.error);
        const avgSize = (horzError.averageSize + vertError.averageSize + diagDownError.averageSize + diagUpError.averageSize) / 4;
        const sizeError = ((horzError.averageSize - avgSize) ** 2 +
            (vertError.averageSize - avgSize) ** 2 +
            (diagDownError.averageSize - avgSize) ** 2 +
            (diagUpError.averageSize - avgSize) ** 2) / avgSize;
        return ratioError + sizeError;
    }
    catch {
        return Infinity;
    }
}
function recenterLocation(matrix, p) {
    let leftX = Math.round(p.x);
    while (matrix.get(leftX, Math.round(p.y))) {
        leftX--;
    }
    let rightX = Math.round(p.x);
    while (matrix.get(rightX, Math.round(p.y))) {
        rightX++;
    }
    const x = (leftX + rightX) / 2;
    let topY = Math.round(p.y);
    while (matrix.get(Math.round(x), topY)) {
        topY--;
    }
    let bottomY = Math.round(p.y);
    while (matrix.get(Math.round(x), bottomY)) {
        bottomY++;
    }
    const y = (topY + bottomY) / 2;
    return { x, y };
}
export function locate(matrix) {
    const finderPatternQuads = [];
    let activeFinderPatternQuads = [];
    const alignmentPatternQuads = [];
    let activeAlignmentPatternQuads = [];
    for (let y = 0; y <= matrix.height; y++) {
        let length = 0;
        let lastBit = false;
        let scans = [0, 0, 0, 0, 0];
        for (let x = -1; x <= matrix.width; x++) {
            const v = matrix.get(x, y);
            if (v === lastBit) {
                length++;
            }
            else {
                scans = [scans[1], scans[2], scans[3], scans[4], length];
                length = 1;
                lastBit = v;
                // Do the last 5 color changes ~ match the expected ratio for a finder pattern? 1:1:3:1:1 of b:w:b:w:b
                const averageFinderPatternBlocksize = sum(scans) / 7;
                const validFinderPattern = Math.abs(scans[0] - averageFinderPatternBlocksize) < averageFinderPatternBlocksize &&
                    Math.abs(scans[1] - averageFinderPatternBlocksize) < averageFinderPatternBlocksize &&
                    Math.abs(scans[2] - 3 * averageFinderPatternBlocksize) < 3 * averageFinderPatternBlocksize &&
                    Math.abs(scans[3] - averageFinderPatternBlocksize) < averageFinderPatternBlocksize &&
                    Math.abs(scans[4] - averageFinderPatternBlocksize) < averageFinderPatternBlocksize &&
                    !v; // And make sure the current pixel is white since finder patterns are bordered in white
                // Do the last 3 color changes ~ match the expected ratio for an alignment pattern? 1:1:1 of w:b:w
                const averageAlignmentPatternBlocksize = sum(scans.slice(-3)) / 3;
                const validAlignmentPattern = Math.abs(scans[2] - averageAlignmentPatternBlocksize) < averageAlignmentPatternBlocksize &&
                    Math.abs(scans[3] - averageAlignmentPatternBlocksize) < averageAlignmentPatternBlocksize &&
                    Math.abs(scans[4] - averageAlignmentPatternBlocksize) < averageAlignmentPatternBlocksize &&
                    v; // Is the current pixel black since alignment patterns are bordered in black
                if (validFinderPattern) {
                    // Compute the start and end x values of the large center black square
                    const endX = x - scans[3] - scans[4];
                    const startX = endX - scans[2];
                    const line = { startX, endX, y };
                    // Is there a quad directly above the current spot? If so, extend it with the new line. Otherwise, create a new quad with
                    // that line as the starting point.
                    const matchingQuads = activeFinderPatternQuads.filter(q => (startX >= q.bottom.startX && startX <= q.bottom.endX) ||
                        (endX >= q.bottom.startX && startX <= q.bottom.endX) ||
                        (startX <= q.bottom.startX && endX >= q.bottom.endX && ((scans[2] / (q.bottom.endX - q.bottom.startX)) < MAX_QUAD_RATIO &&
                            (scans[2] / (q.bottom.endX - q.bottom.startX)) > MIN_QUAD_RATIO)));
                    if (matchingQuads.length > 0) {
                        matchingQuads[0].bottom = line;
                    }
                    else {
                        activeFinderPatternQuads.push({ top: line, bottom: line });
                    }
                }
                if (validAlignmentPattern) {
                    // Compute the start and end x values of the center black square
                    const endX = x - scans[4];
                    const startX = endX - scans[3];
                    const line = { startX, y, endX };
                    // Is there a quad directly above the current spot? If so, extend it with the new line. Otherwise, create a new quad with
                    // that line as the starting point.
                    const matchingQuads = activeAlignmentPatternQuads.filter(q => (startX >= q.bottom.startX && startX <= q.bottom.endX) ||
                        (endX >= q.bottom.startX && startX <= q.bottom.endX) ||
                        (startX <= q.bottom.startX && endX >= q.bottom.endX && ((scans[2] / (q.bottom.endX - q.bottom.startX)) < MAX_QUAD_RATIO &&
                            (scans[2] / (q.bottom.endX - q.bottom.startX)) > MIN_QUAD_RATIO)));
                    if (matchingQuads.length > 0) {
                        matchingQuads[0].bottom = line;
                    }
                    else {
                        activeAlignmentPatternQuads.push({ top: line, bottom: line });
                    }
                }
            }
        }
        finderPatternQuads.push(...activeFinderPatternQuads.filter(q => q.bottom.y !== y && q.bottom.y - q.top.y >= 2));
        activeFinderPatternQuads = activeFinderPatternQuads.filter(q => q.bottom.y === y);
        alignmentPatternQuads.push(...activeAlignmentPatternQuads.filter(q => q.bottom.y !== y));
        activeAlignmentPatternQuads = activeAlignmentPatternQuads.filter(q => q.bottom.y === y);
    }
    finderPatternQuads.push(...activeFinderPatternQuads.filter(q => q.bottom.y - q.top.y >= 2));
    alignmentPatternQuads.push(...activeAlignmentPatternQuads);
    const finderPatternGroups = finderPatternQuads
        .filter(q => q.bottom.y - q.top.y >= 2) // All quads must be at least 2px tall since the center square is larger than a block
        .map(q => {
        const x = (q.top.startX + q.top.endX + q.bottom.startX + q.bottom.endX) / 4;
        const y = (q.top.y + q.bottom.y + 1) / 2;
        if (!matrix.get(Math.round(x), Math.round(y))) {
            return;
        }
        const lengths = [q.top.endX - q.top.startX, q.bottom.endX - q.bottom.startX, q.bottom.y - q.top.y + 1];
        const size = sum(lengths) / lengths.length;
        const score = scorePattern({ x: Math.round(x), y: Math.round(y) }, [1, 1, 3, 1, 1], matrix);
        return { score, x, y, size };
    })
        .filter(q => !!q) // Filter out any rejected quads from above
        .sort((a, b) => a.score - b.score)
        // Now take the top finder pattern options and try to find 2 other options with a similar size.
        .map((point, i, finderPatterns) => {
        if (i > MAX_FINDERPATTERNS_TO_SEARCH) {
            return null;
        }
        const otherPoints = finderPatterns
            .filter((p, ii) => i !== ii)
            .map(p => ({ x: p.x, y: p.y, score: p.score + ((p.size - point.size) ** 2) / point.size, size: p.size }))
            .sort((a, b) => a.score - b.score);
        if (otherPoints.length < 2) {
            return null;
        }
        const score = point.score + otherPoints[0].score + otherPoints[1].score;
        return { points: [point].concat(otherPoints.slice(0, 2)), score };
    })
        .filter(q => !!q) // Filter out any rejected finder patterns from above
        .sort((a, b) => a.score - b.score);
    if (finderPatternGroups.length === 0) {
        return null;
    }
    const { topRight, topLeft, bottomLeft } = reorderFinderPatterns(finderPatternGroups[0].points[0], finderPatternGroups[0].points[1], finderPatternGroups[0].points[2]);
    const alignment = findAlignmentPattern(matrix, alignmentPatternQuads, topRight, topLeft, bottomLeft);
    const result = [];
    if (alignment) {
        result.push({
            alignmentPattern: { x: alignment.alignmentPattern.x, y: alignment.alignmentPattern.y },
            bottomLeft: { x: bottomLeft.x, y: bottomLeft.y },
            dimension: alignment.dimension,
            topLeft: { x: topLeft.x, y: topLeft.y },
            topRight: { x: topRight.x, y: topRight.y },
        });
    }
    // We normally use the center of the quads as the location of the tracking points, which is optimal for most cases and will account
    // for a skew in the image. However, In some cases, a slight skew might not be real and instead be caused by image compression
    // errors and/or low resolution. For those cases, we'd be better off centering the point exactly in the middle of the black area. We
    // compute and return the location data for the naively centered points as it is little additional work and allows for multiple
    // attempts at decoding harder images.
    const midTopRight = recenterLocation(matrix, topRight);
    const midTopLeft = recenterLocation(matrix, topLeft);
    const midBottomLeft = recenterLocation(matrix, bottomLeft);
    const centeredAlignment = findAlignmentPattern(matrix, alignmentPatternQuads, midTopRight, midTopLeft, midBottomLeft);
    if (centeredAlignment) {
        result.push({
            alignmentPattern: { x: centeredAlignment.alignmentPattern.x, y: centeredAlignment.alignmentPattern.y },
            bottomLeft: { x: midBottomLeft.x, y: midBottomLeft.y },
            topLeft: { x: midTopLeft.x, y: midTopLeft.y },
            topRight: { x: midTopRight.x, y: midTopRight.y },
            dimension: centeredAlignment.dimension,
        });
    }
    if (result.length === 0) {
        return null;
    }
    return result;
}
function findAlignmentPattern(matrix, alignmentPatternQuads, topRight, topLeft, bottomLeft) {
    // Now that we've found the three finder patterns we can determine the blockSize and the size of the QR code.
    // We'll use these to help find the alignment pattern but also later when we do the extraction.
    let dimension;
    let moduleSize;
    try {
        ({ dimension, moduleSize } = computeDimension(topLeft, topRight, bottomLeft, matrix));
    }
    catch (e) {
        return null;
    }
    // Now find the alignment pattern
    const bottomRightFinderPattern = {
        x: topRight.x - topLeft.x + bottomLeft.x,
        y: topRight.y - topLeft.y + bottomLeft.y,
    };
    const modulesBetweenFinderPatterns = ((distance(topLeft, bottomLeft) + distance(topLeft, topRight)) / 2 / moduleSize);
    const correctionToTopLeft = 1 - (3 / modulesBetweenFinderPatterns);
    const expectedAlignmentPattern = {
        x: topLeft.x + correctionToTopLeft * (bottomRightFinderPattern.x - topLeft.x),
        y: topLeft.y + correctionToTopLeft * (bottomRightFinderPattern.y - topLeft.y),
    };
    const alignmentPatterns = alignmentPatternQuads
        .map(q => {
        const x = (q.top.startX + q.top.endX + q.bottom.startX + q.bottom.endX) / 4;
        const y = (q.top.y + q.bottom.y + 1) / 2;
        if (!matrix.get(Math.floor(x), Math.floor(y))) {
            return;
        }
        const sizeScore = scorePattern({ x: Math.floor(x), y: Math.floor(y) }, [1, 1, 1], matrix);
        const score = sizeScore + distance({ x, y }, expectedAlignmentPattern);
        return { x, y, score };
    })
        .filter(v => !!v)
        .sort((a, b) => a.score - b.score);
    // If there are less than 15 modules between finder patterns it's a version 1 QR code and as such has no alignmemnt pattern
    // so we can only use our best guess.
    const alignmentPattern = modulesBetweenFinderPatterns >= 15 && alignmentPatterns.length ? alignmentPatterns[0] : expectedAlignmentPattern;
    return { alignmentPattern, dimension };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9uZ3gtc2Nhbm5lci1xcmNvZGUvc3JjL2xpYi9xcmNvZGUvbG9jYXRvci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxNQUFNLDRCQUE0QixHQUFHLENBQUMsQ0FBQztBQUN2QyxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUM7QUFDM0IsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDO0FBZTNCLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBUSxFQUFFLENBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBRXhGLFNBQVMsR0FBRyxDQUFDLE1BQWdCO0lBQzNCLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN4QyxDQUFDO0FBRUQsNkVBQTZFO0FBQzdFLFNBQVMscUJBQXFCLENBQUMsUUFBZSxFQUFFLFFBQWUsRUFBRSxRQUFlO0lBQzlFLHlDQUF5QztJQUN6QyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3BELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUN0RCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFFdEQsSUFBSSxVQUFpQixDQUFDO0lBQ3RCLElBQUksT0FBYyxDQUFDO0lBQ25CLElBQUksUUFBZSxDQUFDO0lBRXBC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LEVBQUUsU0FBUyxFQUFFLENBQUM7QUFDekMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEJpdE1hdHJpeCB9IGZyb20gXCIuLi9CaXRNYXRyaXhcIjtcblxuY29uc3QgTUFYX0ZJTkRFUlBBVFRFUk5TX1RPX1NFQVJDSCA9IDQ7XG5jb25zdCBNSU5fUVVBRF9SQVRJTyA9IDAuNTtcbmNvbnN0IE1BWF9RVUFEX1JBVElPID0gMS41O1xuXG5leHBvcnQgaW50ZXJmYWNlIFBvaW50IHtcbiAgeDogbnVtYmVyO1xuICB5OiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUVJMb2NhdGlvbiB7XG4gIHRvcFJpZ2h0OiBQb2ludDtcbiAgYm90dG9tTGVmdDogUG9pbnQ7XG4gIHRvcExlZnQ6IFBvaW50O1xuICBhbGlnbm1lbnRQYXR0ZXJuOiBQb2ludDtcbiAgZGltZW5zaW9uOiBudW1iZXI7XG59XG5cbmNvbnN0IGRpc3RhbmNlID0gKGE6IFBvaW50LCBiOiBQb2ludCkgPT4gTWF0aC5zcXJ0KChiLnggLSBhLngpICoqIDIgKyAoYi55IC0gYS55KSAqKiAyKTtcblxuZnVuY3Rpb24gc3VtKHZhbHVlczogbnVtYmVyW10pIHtcbiAgcmV0dXJuIHZhbHVlcy5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiKTtcbn1cblxuLy8gVGFrZXMgdGhyZWUgZmluZGVyIHBhdHRlcm5zIGFuZCBvcmdhbml6ZXMgdGhlbSBpbnRvIHRvcExlZnQsIHRvcFJpZ2h0LCBldGNcbmZ1bmN0aW9uIHJlb3JkZXJGaW5kZXJQYXR0ZXJucyhwYXR0ZXJuMTogUG9pbnQsIHBhdHRlcm4yOiBQb2ludCwgcGF0dGVybjM6IFBvaW50KSB7XG4gIC8vIEZpbmQgZGlzdGFuY2VzIGJldHdlZW4gcGF0dGVybiBjZW50ZXJzXG4gIGNvbnN0IG9uZVR3b0Rpc3RhbmNlID0gZGlzdGFuY2UocGF0dGVybjEsIHBhdHRlcm4yKTtcbiAgY29uc3QgdHdvVGhyZWVEaXN0YW5jZSA9IGRpc3RhbmNlKHBhdHRlcm4yLCBwYXR0ZXJuMyk7XG4gIGNvbnN0IG9uZVRocmVlRGlzdGFuY2UgPSBkaXN0YW5jZShwYXR0ZXJuMSwgcGF0dGVybjMpO1xuXG4gIGxldCBib3R0b21MZWZ0OiBQb2ludDtcbiAgbGV0IHRvcExlZnQ6IFBvaW50O1xuICBsZXQgdG9wUmlnaHQ6IFBvaW50O1xuXG4gIC8vIEFzc3VtZSBvbmUgY2xvc2VzdCB0byBvdGhlciB0d28gaXMgQjsgQSBhbmQgQyB3aWxsIGp1c3QgYmUgZ3Vlc3NlcyBhdCBmaXJzdFxuICBpZiAodHdvVGhyZWVEaXN0YW5jZSA+PSBvbmVUd29EaXN0YW5jZSAmJiB0d29UaHJlZURpc3RhbmNlID49IG9uZVRocmVlRGlzdGFuY2UpIHtcbiAgICBbYm90dG9tTGVmdCwgdG9wTGVmdCwgdG9wUmlnaHRdID0gW3BhdHRlcm4yLCBwYXR0ZXJuMSwgcGF0dGVybjNdO1xuICB9IGVsc2UgaWYgKG9uZVRocmVlRGlzdGFuY2UgPj0gdHdvVGhyZWVEaXN0YW5jZSAmJiBvbmVUaHJlZURpc3RhbmNlID49IG9uZVR3b0Rpc3RhbmNlKSB7XG4gICAgW2JvdHRvbUxlZnQsIHRvcExlZnQsIHRvcFJpZ2h0XSA9IFtwYXR0ZXJuMSwgcGF0dGVybjIsIHBhdHRlcm4zXTtcbiAgfSBlbHNlIHtcbiAgICBbYm90dG9tTGVmdCwgdG9wTGVmdCwgdG9wUmlnaHRdID0gW3BhdHRlcm4xLCBwYXR0ZXJuMywgcGF0dGVybjJdO1xuICB9XG5cbiAgLy8gVXNlIGNyb3NzIHByb2R1Y3QgdG8gZmlndXJlIG91dCB3aGV0aGVyIGJvdHRvbUxlZnQgKEEpIGFuZCB0b3BSaWdodCAoQykgYXJlIGNvcnJlY3Qgb3IgZmxpcHBlZCBpbiByZWxhdGlvbiB0byB0b3BMZWZ0IChCKVxuICAvLyBUaGlzIGFza3Mgd2hldGhlciBCQyB4IEJBIGhhcyBhIHBvc2l0aXZlIHogY29tcG9uZW50LCB3aGljaCBpcyB0aGUgYXJyYW5nZW1lbnQgd2Ugd2FudC4gSWYgaXQncyBuZWdhdGl2ZSwgdGhlblxuICAvLyB3ZSd2ZSBnb3QgaXQgZmxpcHBlZCBhcm91bmQgYW5kIHNob3VsZCBzd2FwIHRvcFJpZ2h0IGFuZCBib3R0b21MZWZ0LlxuICBpZiAoKCh0b3BSaWdodC54IC0gdG9wTGVmdC54KSAqIChib3R0b21MZWZ0LnkgLSB0b3BMZWZ0LnkpKSAtICgodG9wUmlnaHQueSAtIHRvcExlZnQueSkgKiAoYm90dG9tTGVmdC54IC0gdG9wTGVmdC54KSkgPCAwKSB7XG4gICAgW2JvdHRvbUxlZnQsIHRvcFJpZ2h0XSA9IFt0b3BSaWdodCwgYm90dG9tTGVmdF07XG4gIH1cblxuICByZXR1cm4geyBib3R0b21MZWZ0LCB0b3BMZWZ0LCB0b3BSaWdodCB9O1xufVxuXG4vLyBDb21wdXRlcyB0aGUgZGltZW5zaW9uIChudW1iZXIgb2YgbW9kdWxlcyBvbiBhIHNpZGUpIG9mIHRoZSBRUiBDb2RlIGJhc2VkIG9uIHRoZSBwb3NpdGlvbiBvZiB0aGUgZmluZGVyIHBhdHRlcm5zXG5mdW5jdGlvbiBjb21wdXRlRGltZW5zaW9uKHRvcExlZnQ6IFBvaW50LCB0b3BSaWdodDogUG9pbnQsIGJvdHRvbUxlZnQ6IFBvaW50LCBtYXRyaXg6IEJpdE1hdHJpeCkge1xuICBjb25zdCBtb2R1bGVTaXplID0gKFxuICAgIHN1bShjb3VudEJsYWNrV2hpdGVSdW4odG9wTGVmdCwgYm90dG9tTGVmdCwgbWF0cml4LCA1KSkgLyA3ICsgLy8gRGl2aWRlIGJ5IDcgc2luY2UgdGhlIHJhdGlvIGlzIDE6MTozOjE6MVxuICAgIHN1bShjb3VudEJsYWNrV2hpdGVSdW4odG9wTGVmdCwgdG9wUmlnaHQsIG1hdHJpeCwgNSkpIC8gNyArXG4gICAgc3VtKGNvdW50QmxhY2tXaGl0ZVJ1bihib3R0b21MZWZ0LCB0b3BMZWZ0LCBtYXRyaXgsIDUpKSAvIDcgK1xuICAgIHN1bShjb3VudEJsYWNrV2hpdGVSdW4odG9wUmlnaHQsIHRvcExlZnQsIG1hdHJpeCwgNSkpIC8gN1xuICApIC8gNDtcblxuICBpZiAobW9kdWxlU2l6ZSA8IDEpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIG1vZHVsZSBzaXplXCIpO1xuICB9XG5cbiAgY29uc3QgdG9wRGltZW5zaW9uID0gTWF0aC5yb3VuZChkaXN0YW5jZSh0b3BMZWZ0LCB0b3BSaWdodCkgLyBtb2R1bGVTaXplKTtcbiAgY29uc3Qgc2lkZURpbWVuc2lvbiA9IE1hdGgucm91bmQoZGlzdGFuY2UodG9wTGVmdCwgYm90dG9tTGVmdCkgLyBtb2R1bGVTaXplKTtcbiAgbGV0IGRpbWVuc2lvbiA9IE1hdGguZmxvb3IoKHRvcERpbWVuc2lvbiArIHNpZGVEaW1lbnNpb24pIC8gMikgKyA3O1xuICBzd2l0Y2ggKGRpbWVuc2lvbiAlIDQpIHtcbiAgICBjYXNlIDA6XG4gICAgICBkaW1lbnNpb24rKztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMjpcbiAgICAgIGRpbWVuc2lvbi0tO1xuICAgICAgYnJlYWs7XG4gIH1cbiAgcmV0dXJuIHsgZGltZW5zaW9uLCBtb2R1bGVTaXplIH07XG59XG5cbi8vIFRha2VzIGFuIG9yaWdpbiBwb2ludCBhbmQgYW4gZW5kIHBvaW50IGFuZCBjb3VudHMgdGhlIHNpemVzIG9mIHRoZSBibGFjayB3aGl0ZSBydW4gZnJvbSB0aGUgb3JpZ2luIHRvd2FyZHMgdGhlIGVuZCBwb2ludC5cbi8vIFJldHVybnMgYW4gYXJyYXkgb2YgZWxlbWVudHMsIHJlcHJlc2VudGluZyB0aGUgcGl4ZWwgc2l6ZSBvZiB0aGUgYmxhY2sgd2hpdGUgcnVuLlxuLy8gVXNlcyBhIHZhcmlhbnQgb2YgaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9CcmVzZW5oYW0nc19saW5lX2FsZ29yaXRobVxuZnVuY3Rpb24gY291bnRCbGFja1doaXRlUnVuVG93YXJkc1BvaW50KG9yaWdpbjogUG9pbnQsIGVuZDogUG9pbnQsIG1hdHJpeDogQml0TWF0cml4LCBsZW5ndGg6IG51bWJlcikge1xuICBjb25zdCBzd2l0Y2hQb2ludHM6IFBvaW50W10gPSBbe3g6IE1hdGguZmxvb3Iob3JpZ2luLngpLCB5OiBNYXRoLmZsb29yKG9yaWdpbi55KX1dO1xuICBjb25zdCBzdGVlcCA9IE1hdGguYWJzKGVuZC55IC0gb3JpZ2luLnkpID4gTWF0aC5hYnMoZW5kLnggLSBvcmlnaW4ueCk7XG5cbiAgbGV0IGZyb21YOiBudW1iZXI7XG4gIGxldCBmcm9tWTogbnVtYmVyO1xuICBsZXQgdG9YOiBudW1iZXI7XG4gIGxldCB0b1k6IG51bWJlcjtcbiAgaWYgKHN0ZWVwKSB7XG4gICAgZnJvbVggPSBNYXRoLmZsb29yKG9yaWdpbi55KTtcbiAgICBmcm9tWSA9IE1hdGguZmxvb3Iob3JpZ2luLngpO1xuICAgIHRvWCA9IE1hdGguZmxvb3IoZW5kLnkpO1xuICAgIHRvWSA9IE1hdGguZmxvb3IoZW5kLngpO1xuICB9IGVsc2Uge1xuICAgIGZyb21YID0gTWF0aC5mbG9vcihvcmlnaW4ueCk7XG4gICAgZnJvbVkgPSBNYXRoLmZsb29yKG9yaWdpbi55KTtcbiAgICB0b1ggPSBNYXRoLmZsb29yKGVuZC54KTtcbiAgICB0b1kgPSBNYXRoLmZsb29yKGVuZC55KTtcbiAgfVxuXG4gIGNvbnN0IGR4ID0gTWF0aC5hYnModG9YIC0gZnJvbVgpO1xuICBjb25zdCBkeSA9IE1hdGguYWJzKHRvWSAtIGZyb21ZKTtcbiAgbGV0IGVycm9yID0gTWF0aC5mbG9vcigtZHggLyAyKTtcbiAgY29uc3QgeFN0ZXAgPSBmcm9tWCA8IHRvWCA/IDEgOiAtMTtcbiAgY29uc3QgeVN0ZXAgPSBmcm9tWSA8IHRvWSA/IDEgOiAtMTtcblxuICBsZXQgY3VycmVudFBpeGVsID0gdHJ1ZTtcbiAgLy8gTG9vcCB1cCB1bnRpbCB4ID09IHRvWCwgYnV0IG5vdCBiZXlvbmRcbiAgZm9yIChsZXQgeCA9IGZyb21YLCB5ID0gZnJvbVk7IHggIT09IHRvWCArIHhTdGVwOyB4ICs9IHhTdGVwKSB7XG4gICAgLy8gRG9lcyBjdXJyZW50IHBpeGVsIG1lYW4gd2UgaGF2ZSBtb3ZlZCB3aGl0ZSB0byBibGFjayBvciB2aWNlIHZlcnNhP1xuICAgIC8vIFNjYW5uaW5nIGJsYWNrIGluIHN0YXRlIDAsMiBhbmQgd2hpdGUgaW4gc3RhdGUgMSwgc28gaWYgd2UgZmluZCB0aGUgd3JvbmdcbiAgICAvLyBjb2xvciwgYWR2YW5jZSB0byBuZXh0IHN0YXRlIG9yIGVuZCBpZiB3ZSBhcmUgaW4gc3RhdGUgMiBhbHJlYWR5XG4gICAgY29uc3QgcmVhbFggPSBzdGVlcCA/IHkgOiB4O1xuICAgIGNvbnN0IHJlYWxZID0gc3RlZXAgPyB4IDogeTtcbiAgICBpZiAobWF0cml4LmdldChyZWFsWCwgcmVhbFkpICE9PSBjdXJyZW50UGl4ZWwpIHtcbiAgICAgIGN1cnJlbnRQaXhlbCA9ICFjdXJyZW50UGl4ZWw7XG4gICAgICBzd2l0Y2hQb2ludHMucHVzaCh7eDogcmVhbFgsIHk6IHJlYWxZfSk7XG4gICAgICBpZiAoc3dpdGNoUG9pbnRzLmxlbmd0aCA9PT0gbGVuZ3RoICsgMSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgZXJyb3IgKz0gZHk7XG4gICAgaWYgKGVycm9yID4gMCkge1xuICAgICAgaWYgKHkgPT09IHRvWSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHkgKz0geVN0ZXA7XG4gICAgICBlcnJvciAtPSBkeDtcbiAgICB9XG4gIH1cbiAgY29uc3QgZGlzdGFuY2VzOiBudW1iZXJbXSA9IFtdO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHN3aXRjaFBvaW50c1tpXSAmJiBzd2l0Y2hQb2ludHNbaSArIDFdKSB7XG4gICAgICBkaXN0YW5jZXMucHVzaChkaXN0YW5jZShzd2l0Y2hQb2ludHNbaV0sIHN3aXRjaFBvaW50c1tpICsgMV0pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGlzdGFuY2VzLnB1c2goMCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBkaXN0YW5jZXM7XG59XG5cbi8vIFRha2VzIGFuIG9yaWdpbiBwb2ludCBhbmQgYW4gZW5kIHBvaW50IGFuZCBjb3VudHMgdGhlIHNpemVzIG9mIHRoZSBibGFjayB3aGl0ZSBydW4gaW4gdGhlIG9yaWdpbiBwb2ludFxuLy8gYWxvbmcgdGhlIGxpbmUgdGhhdCBpbnRlcnNlY3RzIHdpdGggdGhlIGVuZCBwb2ludC4gUmV0dXJucyBhbiBhcnJheSBvZiBlbGVtZW50cywgcmVwcmVzZW50aW5nIHRoZSBwaXhlbCBzaXplc1xuLy8gb2YgdGhlIGJsYWNrIHdoaXRlIHJ1bi4gVGFrZXMgYSBsZW5ndGggd2hpY2ggcmVwcmVzZW50cyB0aGUgbnVtYmVyIG9mIHN3aXRjaGVzIGZyb20gYmxhY2sgdG8gd2hpdGUgdG8gbG9vayBmb3IuXG5mdW5jdGlvbiBjb3VudEJsYWNrV2hpdGVSdW4ob3JpZ2luOiBQb2ludCwgZW5kOiBQb2ludCwgbWF0cml4OiBCaXRNYXRyaXgsIGxlbmd0aDogbnVtYmVyKSB7XG4gIGNvbnN0IHJpc2UgPSBlbmQueSAtIG9yaWdpbi55O1xuICBjb25zdCBydW4gPSBlbmQueCAtIG9yaWdpbi54O1xuXG4gIGNvbnN0IHRvd2FyZHNFbmQgPSBjb3VudEJsYWNrV2hpdGVSdW5Ub3dhcmRzUG9pbnQob3JpZ2luLCBlbmQsIG1hdHJpeCwgTWF0aC5jZWlsKGxlbmd0aCAvIDIpKTtcbiAgY29uc3QgYXdheUZyb21FbmQgPSBjb3VudEJsYWNrV2hpdGVSdW5Ub3dhcmRzUG9pbnQob3JpZ2luLCB7eDogb3JpZ2luLnggLSBydW4sIHk6IG9yaWdpbi55IC0gcmlzZX0sIG1hdHJpeCwgTWF0aC5jZWlsKGxlbmd0aCAvIDIpKTtcblxuICBjb25zdCBtaWRkbGVWYWx1ZSA9IHRvd2FyZHNFbmQuc2hpZnQoKSArIGF3YXlGcm9tRW5kLnNoaWZ0KCkgLSAxOyAvLyBTdWJzdHJhY3Qgb25lIHNvIHdlIGRvbid0IGRvdWJsZSBjb3VudCBhIHBpeGVsXG4gIHJldHVybiBhd2F5RnJvbUVuZC5jb25jYXQobWlkZGxlVmFsdWUpLmNvbmNhdCguLi50b3dhcmRzRW5kKTtcbn1cblxuLy8gVGFrZXMgaW4gYSBibGFjayB3aGl0ZSBydW4gYW5kIGFuIGFycmF5IG9mIGV4cGVjdGVkIHJhdGlvcy4gUmV0dXJucyB0aGUgYXZlcmFnZSBzaXplIG9mIHRoZSBydW4gYXMgd2VsbCBhcyB0aGUgXCJlcnJvclwiIC1cbi8vIHRoYXQgaXMgdGhlIGFtb3VudCB0aGUgcnVuIGRpdmVyZ2VzIGZyb20gdGhlIGV4cGVjdGVkIHJhdGlvXG5mdW5jdGlvbiBzY29yZUJsYWNrV2hpdGVSdW4oc2VxdWVuY2U6IG51bWJlcltdLCByYXRpb3M6IG51bWJlcltdKSB7XG4gIGNvbnN0IGF2ZXJhZ2VTaXplID0gc3VtKHNlcXVlbmNlKSAvIHN1bShyYXRpb3MpO1xuICBsZXQgZXJyb3IgPSAwO1xuICByYXRpb3MuZm9yRWFjaCgocmF0aW8sIGkpID0+IHtcbiAgICBlcnJvciArPSAoc2VxdWVuY2VbaV0gLSByYXRpbyAqIGF2ZXJhZ2VTaXplKSAqKiAyO1xuICB9KTtcblxuICByZXR1cm4geyBhdmVyYWdlU2l6ZSwgZXJyb3IgfTtcbn1cblxuLy8gVGFrZXMgYW4gWCxZIHBvaW50IGFuZCBhbiBhcnJheSBvZiBzaXplcyBhbmQgc2NvcmVzIHRoZSBwb2ludCBhZ2FpbnN0IHRob3NlIHJhdGlvcy5cbi8vIEZvciBleGFtcGxlIGZvciBhIGZpbmRlciBwYXR0ZXJuIHRha2VzIHRoZSByYXRpbyBsaXN0IG9mIDE6MTozOjE6MSBhbmQgY2hlY2tzIGhvcml6b250YWwsIHZlcnRpY2FsIGFuZCBkaWFnb25hbCByYXRpb3Ncbi8vIGFnYWluc3QgdGhhdC5cbmZ1bmN0aW9uIHNjb3JlUGF0dGVybihwb2ludDogUG9pbnQsIHJhdGlvczogbnVtYmVyW10sIG1hdHJpeDogQml0TWF0cml4KSB7XG4gIHRyeSB7XG4gICAgY29uc3QgaG9yaXpvbnRhbFJ1biA9IGNvdW50QmxhY2tXaGl0ZVJ1bihwb2ludCwge3g6IC0xLCB5OiBwb2ludC55fSwgbWF0cml4LCByYXRpb3MubGVuZ3RoKTtcbiAgICBjb25zdCB2ZXJ0aWNhbFJ1biA9IGNvdW50QmxhY2tXaGl0ZVJ1bihwb2ludCwge3g6IHBvaW50LngsIHk6IC0xfSwgbWF0cml4LCByYXRpb3MubGVuZ3RoKTtcblxuICAgIGNvbnN0IHRvcExlZnRQb2ludCA9IHtcbiAgICAgIHg6IE1hdGgubWF4KDAsIHBvaW50LnggLSBwb2ludC55KSAtIDEsXG4gICAgICB5OiBNYXRoLm1heCgwLCBwb2ludC55IC0gcG9pbnQueCkgLSAxLFxuICAgIH07XG4gICAgY29uc3QgdG9wTGVmdEJvdHRvbVJpZ2h0UnVuID0gY291bnRCbGFja1doaXRlUnVuKHBvaW50LCB0b3BMZWZ0UG9pbnQsIG1hdHJpeCwgcmF0aW9zLmxlbmd0aCk7XG5cbiAgICBjb25zdCBib3R0b21MZWZ0UG9pbnQgPSB7XG4gICAgICB4OiBNYXRoLm1pbihtYXRyaXgud2lkdGgsIHBvaW50LnggKyBwb2ludC55KSArIDEsXG4gICAgICB5OiBNYXRoLm1pbihtYXRyaXguaGVpZ2h0LCBwb2ludC55ICsgcG9pbnQueCkgKyAxLFxuICAgIH07XG4gICAgY29uc3QgYm90dG9tTGVmdFRvcFJpZ2h0UnVuID0gY291bnRCbGFja1doaXRlUnVuKHBvaW50LCBib3R0b21MZWZ0UG9pbnQsIG1hdHJpeCwgcmF0aW9zLmxlbmd0aCk7XG5cbiAgICBjb25zdCBob3J6RXJyb3IgPSBzY29yZUJsYWNrV2hpdGVSdW4oaG9yaXpvbnRhbFJ1biwgcmF0aW9zKTtcbiAgICBjb25zdCB2ZXJ0RXJyb3IgPSBzY29yZUJsYWNrV2hpdGVSdW4odmVydGljYWxSdW4sIHJhdGlvcyk7XG4gICAgY29uc3QgZGlhZ0Rvd25FcnJvciA9IHNjb3JlQmxhY2tXaGl0ZVJ1bih0b3BMZWZ0Qm90dG9tUmlnaHRSdW4sIHJhdGlvcyk7XG4gICAgY29uc3QgZGlhZ1VwRXJyb3IgPSBzY29yZUJsYWNrV2hpdGVSdW4oYm90dG9tTGVmdFRvcFJpZ2h0UnVuLCByYXRpb3MpO1xuXG4gICAgY29uc3QgcmF0aW9FcnJvciA9IE1hdGguc3FydChob3J6RXJyb3IuZXJyb3IgKiBob3J6RXJyb3IuZXJyb3IgK1xuICAgICAgdmVydEVycm9yLmVycm9yICogdmVydEVycm9yLmVycm9yICtcbiAgICAgIGRpYWdEb3duRXJyb3IuZXJyb3IgKiBkaWFnRG93bkVycm9yLmVycm9yICtcbiAgICAgIGRpYWdVcEVycm9yLmVycm9yICogZGlhZ1VwRXJyb3IuZXJyb3IpO1xuXG4gICAgY29uc3QgYXZnU2l6ZSA9IChob3J6RXJyb3IuYXZlcmFnZVNpemUgKyB2ZXJ0RXJyb3IuYXZlcmFnZVNpemUgKyBkaWFnRG93bkVycm9yLmF2ZXJhZ2VTaXplICsgZGlhZ1VwRXJyb3IuYXZlcmFnZVNpemUpIC8gNDtcblxuICAgIGNvbnN0IHNpemVFcnJvciA9ICgoaG9yekVycm9yLmF2ZXJhZ2VTaXplIC0gYXZnU2l6ZSkgKiogMiArXG4gICAgICAodmVydEVycm9yLmF2ZXJhZ2VTaXplIC0gYXZnU2l6ZSkgKiogMiArXG4gICAgICAoZGlhZ0Rvd25FcnJvci5hdmVyYWdlU2l6ZSAtIGF2Z1NpemUpICoqIDIgK1xuICAgICAgKGRpYWdVcEVycm9yLmF2ZXJhZ2VTaXplIC0gYXZnU2l6ZSkgKiogMikgLyBhdmdTaXplO1xuICAgIHJldHVybiByYXRpb0Vycm9yICsgc2l6ZUVycm9yO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gSW5maW5pdHk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVjZW50ZXJMb2NhdGlvbihtYXRyaXg6IEJpdE1hdHJpeCwgcDogUG9pbnQpOiBQb2ludCB7XG4gIGxldCBsZWZ0WCA9IE1hdGgucm91bmQocC54KTtcbiAgd2hpbGUgKG1hdHJpeC5nZXQobGVmdFgsIE1hdGgucm91bmQocC55KSkpIHtcbiAgICBsZWZ0WC0tO1xuICB9XG4gIGxldCByaWdodFggPSBNYXRoLnJvdW5kKHAueCk7XG4gIHdoaWxlIChtYXRyaXguZ2V0KHJpZ2h0WCwgTWF0aC5yb3VuZChwLnkpKSkge1xuICAgIHJpZ2h0WCsrO1xuICB9XG4gIGNvbnN0IHggPSAobGVmdFggKyByaWdodFgpIC8gMjtcblxuICBsZXQgdG9wWSA9IE1hdGgucm91bmQocC55KTtcbiAgd2hpbGUgKG1hdHJpeC5nZXQoTWF0aC5yb3VuZCh4KSwgdG9wWSkpIHtcbiAgICB0b3BZLS07XG4gIH1cbiAgbGV0IGJvdHRvbVkgPSBNYXRoLnJvdW5kKHAueSk7XG4gIHdoaWxlIChtYXRyaXguZ2V0KE1hdGgucm91bmQoeCksIGJvdHRvbVkpKSB7XG4gICAgYm90dG9tWSsrO1xuICB9XG4gIGNvbnN0IHkgPSAodG9wWSArIGJvdHRvbVkpIC8gMjtcblxuICByZXR1cm4geyB4LCB5IH07XG59XG5cbmludGVyZmFjZSBRdWFkIHtcbiAgdG9wOiB7XG4gICAgc3RhcnRYOiBudW1iZXI7XG4gICAgZW5kWDogbnVtYmVyO1xuICAgIHk6IG51bWJlcjtcbiAgfTtcbiAgYm90dG9tOiB7XG4gICAgc3RhcnRYOiBudW1iZXI7XG4gICAgZW5kWDogbnVtYmVyO1xuICAgIHk6IG51bWJlcjtcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxvY2F0ZShtYXRyaXg6IEJpdE1hdHJpeCk6IFFSTG9jYXRpb25bXSB7XG4gIGNvbnN0IGZpbmRlclBhdHRlcm5RdWFkczogUXVhZFtdID0gW107XG4gIGxldCBhY3RpdmVGaW5kZXJQYXR0ZXJuUXVhZHM6IFF1YWRbXSA9IFtdO1xuICBjb25zdCBhbGlnbm1lbnRQYXR0ZXJuUXVhZHM6IFF1YWRbXSA9IFtdO1xuICBsZXQgYWN0aXZlQWxpZ25tZW50UGF0dGVyblF1YWRzOiBRdWFkW10gPSBbXTtcblxuICBmb3IgKGxldCB5ID0gMDsgeSA8PSBtYXRyaXguaGVpZ2h0OyB5KyspIHtcbiAgICBsZXQgbGVuZ3RoID0gMDtcbiAgICBsZXQgbGFzdEJpdCA9IGZhbHNlO1xuICAgIGxldCBzY2FucyA9IFswLCAwLCAwLCAwLCAwXTtcblxuICAgIGZvciAobGV0IHggPSAtMTsgeCA8PSBtYXRyaXgud2lkdGg7IHgrKykge1xuICAgICAgY29uc3QgdiA9IG1hdHJpeC5nZXQoeCwgeSk7XG4gICAgICBpZiAodiA9PT0gbGFzdEJpdCkge1xuICAgICAgICBsZW5ndGgrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNjYW5zID0gW3NjYW5zWzFdLCBzY2Fuc1syXSwgc2NhbnNbM10sIHNjYW5zWzRdLCBsZW5ndGhdO1xuICAgICAgICBsZW5ndGggPSAxO1xuICAgICAgICBsYXN0Qml0ID0gdjtcblxuICAgICAgICAvLyBEbyB0aGUgbGFzdCA1IGNvbG9yIGNoYW5nZXMgfiBtYXRjaCB0aGUgZXhwZWN0ZWQgcmF0aW8gZm9yIGEgZmluZGVyIHBhdHRlcm4/IDE6MTozOjE6MSBvZiBiOnc6Yjp3OmJcbiAgICAgICAgY29uc3QgYXZlcmFnZUZpbmRlclBhdHRlcm5CbG9ja3NpemUgPSBzdW0oc2NhbnMpIC8gNztcbiAgICAgICAgY29uc3QgdmFsaWRGaW5kZXJQYXR0ZXJuID1cbiAgICAgICAgICBNYXRoLmFicyhzY2Fuc1swXSAtIGF2ZXJhZ2VGaW5kZXJQYXR0ZXJuQmxvY2tzaXplKSA8IGF2ZXJhZ2VGaW5kZXJQYXR0ZXJuQmxvY2tzaXplICYmXG4gICAgICAgICAgTWF0aC5hYnMoc2NhbnNbMV0gLSBhdmVyYWdlRmluZGVyUGF0dGVybkJsb2Nrc2l6ZSkgPCBhdmVyYWdlRmluZGVyUGF0dGVybkJsb2Nrc2l6ZSAmJlxuICAgICAgICAgIE1hdGguYWJzKHNjYW5zWzJdIC0gMyAqIGF2ZXJhZ2VGaW5kZXJQYXR0ZXJuQmxvY2tzaXplKSA8IDMgKiBhdmVyYWdlRmluZGVyUGF0dGVybkJsb2Nrc2l6ZSAmJlxuICAgICAgICAgIE1hdGguYWJzKHNjYW5zWzNdIC0gYXZlcmFnZUZpbmRlclBhdHRlcm5CbG9ja3NpemUpIDwgYXZlcmFnZUZpbmRlclBhdHRlcm5CbG9ja3NpemUgJiZcbiAgICAgICAgICBNYXRoLmFicyhzY2Fuc1s0XSAtIGF2ZXJhZ2VGaW5kZXJQYXR0ZXJuQmxvY2tzaXplKSA8IGF2ZXJhZ2VGaW5kZXJQYXR0ZXJuQmxvY2tzaXplICYmXG4gICAgICAgICAgIXY7IC8vIEFuZCBtYWtlIHN1cmUgdGhlIGN1cnJlbnQgcGl4ZWwgaXMgd2hpdGUgc2luY2UgZmluZGVyIHBhdHRlcm5zIGFyZSBib3JkZXJlZCBpbiB3aGl0ZVxuXG4gICAgICAgIC8vIERvIHRoZSBsYXN0IDMgY29sb3IgY2hhbmdlcyB+IG1hdGNoIHRoZSBleHBlY3RlZCByYXRpbyBmb3IgYW4gYWxpZ25tZW50IHBhdHRlcm4/IDE6MToxIG9mIHc6Yjp3XG4gICAgICAgIGNvbnN0IGF2ZXJhZ2VBbGlnbm1lbnRQYXR0ZXJuQmxvY2tzaXplID0gc3VtKHNjYW5zLnNsaWNlKC0zKSkgLyAzO1xuICAgICAgICBjb25zdCB2YWxpZEFsaWdubWVudFBhdHRlcm4gPVxuICAgICAgICAgIE1hdGguYWJzKHNjYW5zWzJdIC0gYXZlcmFnZUFsaWdubWVudFBhdHRlcm5CbG9ja3NpemUpIDwgYXZlcmFnZUFsaWdubWVudFBhdHRlcm5CbG9ja3NpemUgJiZcbiAgICAgICAgICBNYXRoLmFicyhzY2Fuc1szXSAtIGF2ZXJhZ2VBbGlnbm1lbnRQYXR0ZXJuQmxvY2tzaXplKSA8IGF2ZXJhZ2VBbGlnbm1lbnRQYXR0ZXJuQmxvY2tzaXplICYmXG4gICAgICAgICAgTWF0aC5hYnMoc2NhbnNbNF0gLSBhdmVyYWdlQWxpZ25tZW50UGF0dGVybkJsb2Nrc2l6ZSkgPCBhdmVyYWdlQWxpZ25tZW50UGF0dGVybkJsb2Nrc2l6ZSAmJlxuICAgICAgICAgIHY7IC8vIElzIHRoZSBjdXJyZW50IHBpeGVsIGJsYWNrIHNpbmNlIGFsaWdubWVudCBwYXR0ZXJucyBhcmUgYm9yZGVyZWQgaW4gYmxhY2tcblxuICAgICAgICBpZiAodmFsaWRGaW5kZXJQYXR0ZXJuKSB7XG4gICAgICAgICAgLy8gQ29tcHV0ZSB0aGUgc3RhcnQgYW5kIGVuZCB4IHZhbHVlcyBvZiB0aGUgbGFyZ2UgY2VudGVyIGJsYWNrIHNxdWFyZVxuICAgICAgICAgIGNvbnN0IGVuZFggPSB4IC0gc2NhbnNbM10gLSBzY2Fuc1s0XTtcbiAgICAgICAgICBjb25zdCBzdGFydFggPSBlbmRYIC0gc2NhbnNbMl07XG5cbiAgICAgICAgICBjb25zdCBsaW5lID0geyBzdGFydFgsIGVuZFgsIHkgfTtcbiAgICAgICAgICAvLyBJcyB0aGVyZSBhIHF1YWQgZGlyZWN0bHkgYWJvdmUgdGhlIGN1cnJlbnQgc3BvdD8gSWYgc28sIGV4dGVuZCBpdCB3aXRoIHRoZSBuZXcgbGluZS4gT3RoZXJ3aXNlLCBjcmVhdGUgYSBuZXcgcXVhZCB3aXRoXG4gICAgICAgICAgLy8gdGhhdCBsaW5lIGFzIHRoZSBzdGFydGluZyBwb2ludC5cbiAgICAgICAgICBjb25zdCBtYXRjaGluZ1F1YWRzID0gYWN0aXZlRmluZGVyUGF0dGVyblF1YWRzLmZpbHRlcihxID0+XG4gICAgICAgICAgICAoc3RhcnRYID49IHEuYm90dG9tLnN0YXJ0WCAmJiBzdGFydFggPD0gcS5ib3R0b20uZW5kWCkgfHxcbiAgICAgICAgICAgIChlbmRYID49IHEuYm90dG9tLnN0YXJ0WCAmJiBzdGFydFggPD0gcS5ib3R0b20uZW5kWCkgfHxcbiAgICAgICAgICAgIChzdGFydFggPD0gcS5ib3R0b20uc3RhcnRYICYmIGVuZFggPj0gcS5ib3R0b20uZW5kWCAmJiAoXG4gICAgICAgICAgICAgIChzY2Fuc1syXSAvIChxLmJvdHRvbS5lbmRYIC0gcS5ib3R0b20uc3RhcnRYKSkgPCBNQVhfUVVBRF9SQVRJTyAmJlxuICAgICAgICAgICAgICAoc2NhbnNbMl0gLyAocS5ib3R0b20uZW5kWCAtIHEuYm90dG9tLnN0YXJ0WCkpID4gTUlOX1FVQURfUkFUSU9cbiAgICAgICAgICAgICkpLFxuICAgICAgICAgICk7XG4gICAgICAgICAgaWYgKG1hdGNoaW5nUXVhZHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbWF0Y2hpbmdRdWFkc1swXS5ib3R0b20gPSBsaW5lO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhY3RpdmVGaW5kZXJQYXR0ZXJuUXVhZHMucHVzaCh7IHRvcDogbGluZSwgYm90dG9tOiBsaW5lIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsaWRBbGlnbm1lbnRQYXR0ZXJuKSB7XG4gICAgICAgICAgLy8gQ29tcHV0ZSB0aGUgc3RhcnQgYW5kIGVuZCB4IHZhbHVlcyBvZiB0aGUgY2VudGVyIGJsYWNrIHNxdWFyZVxuICAgICAgICAgIGNvbnN0IGVuZFggPSB4IC0gc2NhbnNbNF07XG4gICAgICAgICAgY29uc3Qgc3RhcnRYID0gZW5kWCAtIHNjYW5zWzNdO1xuXG4gICAgICAgICAgY29uc3QgbGluZSA9IHsgc3RhcnRYLCB5LCBlbmRYIH07XG4gICAgICAgICAgLy8gSXMgdGhlcmUgYSBxdWFkIGRpcmVjdGx5IGFib3ZlIHRoZSBjdXJyZW50IHNwb3Q/IElmIHNvLCBleHRlbmQgaXQgd2l0aCB0aGUgbmV3IGxpbmUuIE90aGVyd2lzZSwgY3JlYXRlIGEgbmV3IHF1YWQgd2l0aFxuICAgICAgICAgIC8vIHRoYXQgbGluZSBhcyB0aGUgc3RhcnRpbmcgcG9pbnQuXG4gICAgICAgICAgY29uc3QgbWF0Y2hpbmdRdWFkcyA9IGFjdGl2ZUFsaWdubWVudFBhdHRlcm5RdWFkcy5maWx0ZXIocSA9PlxuICAgICAgICAgICAgKHN0YXJ0WCA+PSBxLmJvdHRvbS5zdGFydFggJiYgc3RhcnRYIDw9IHEuYm90dG9tLmVuZFgpIHx8XG4gICAgICAgICAgICAoZW5kWCA+PSBxLmJvdHRvbS5zdGFydFggJiYgc3RhcnRYIDw9IHEuYm90dG9tLmVuZFgpIHx8XG4gICAgICAgICAgICAoc3RhcnRYIDw9IHEuYm90dG9tLnN0YXJ0WCAmJiBlbmRYID49IHEuYm90dG9tLmVuZFggJiYgKFxuICAgICAgICAgICAgICAoc2NhbnNbMl0gLyAocS5ib3R0b20uZW5kWCAtIHEuYm90dG9tLnN0YXJ0WCkpIDwgTUFYX1FVQURfUkFUSU8gJiZcbiAgICAgICAgICAgICAgKHNjYW5zWzJdIC8gKHEuYm90dG9tLmVuZFggLSBxLmJvdHRvbS5zdGFydFgpKSA+IE1JTl9RVUFEX1JBVElPXG4gICAgICAgICAgICApKSxcbiAgICAgICAgICApO1xuICAgICAgICAgIGlmIChtYXRjaGluZ1F1YWRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIG1hdGNoaW5nUXVhZHNbMF0uYm90dG9tID0gbGluZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWN0aXZlQWxpZ25tZW50UGF0dGVyblF1YWRzLnB1c2goeyB0b3A6IGxpbmUsIGJvdHRvbTogbGluZSB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZmluZGVyUGF0dGVyblF1YWRzLnB1c2goLi4uYWN0aXZlRmluZGVyUGF0dGVyblF1YWRzLmZpbHRlcihxID0+IHEuYm90dG9tLnkgIT09IHkgJiYgcS5ib3R0b20ueSAtIHEudG9wLnkgPj0gMikpO1xuICAgIGFjdGl2ZUZpbmRlclBhdHRlcm5RdWFkcyA9IGFjdGl2ZUZpbmRlclBhdHRlcm5RdWFkcy5maWx0ZXIocSA9PiBxLmJvdHRvbS55ID09PSB5KTtcblxuICAgIGFsaWdubWVudFBhdHRlcm5RdWFkcy5wdXNoKC4uLmFjdGl2ZUFsaWdubWVudFBhdHRlcm5RdWFkcy5maWx0ZXIocSA9PiBxLmJvdHRvbS55ICE9PSB5KSk7XG4gICAgYWN0aXZlQWxpZ25tZW50UGF0dGVyblF1YWRzID0gYWN0aXZlQWxpZ25tZW50UGF0dGVyblF1YWRzLmZpbHRlcihxID0+IHEuYm90dG9tLnkgPT09IHkpO1xuXG4gIH1cblxuICBmaW5kZXJQYXR0ZXJuUXVhZHMucHVzaCguLi5hY3RpdmVGaW5kZXJQYXR0ZXJuUXVhZHMuZmlsdGVyKHEgPT4gcS5ib3R0b20ueSAtIHEudG9wLnkgPj0gMikpO1xuICBhbGlnbm1lbnRQYXR0ZXJuUXVhZHMucHVzaCguLi5hY3RpdmVBbGlnbm1lbnRQYXR0ZXJuUXVhZHMpO1xuXG4gIGNvbnN0IGZpbmRlclBhdHRlcm5Hcm91cHMgPSBmaW5kZXJQYXR0ZXJuUXVhZHNcbiAgICAuZmlsdGVyKHEgPT4gcS5ib3R0b20ueSAtIHEudG9wLnkgPj0gMikgLy8gQWxsIHF1YWRzIG11c3QgYmUgYXQgbGVhc3QgMnB4IHRhbGwgc2luY2UgdGhlIGNlbnRlciBzcXVhcmUgaXMgbGFyZ2VyIHRoYW4gYSBibG9ja1xuICAgIC5tYXAocSA9PiB7IC8vIEluaXRpYWwgc2NvcmluZyBvZiBmaW5kZXIgcGF0dGVybiBxdWFkcyBieSBsb29raW5nIGF0IHRoZWlyIHJhdGlvcywgbm90IHRha2luZyBpbnRvIGFjY291bnQgcG9zaXRpb25cbiAgICAgIGNvbnN0IHggPSAocS50b3Auc3RhcnRYICsgcS50b3AuZW5kWCArIHEuYm90dG9tLnN0YXJ0WCArIHEuYm90dG9tLmVuZFgpIC8gNDtcbiAgICAgIGNvbnN0IHkgPSAocS50b3AueSArIHEuYm90dG9tLnkgKyAxKSAvIDI7XG4gICAgICBpZiAoIW1hdHJpeC5nZXQoTWF0aC5yb3VuZCh4KSwgTWF0aC5yb3VuZCh5KSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBsZW5ndGhzID0gW3EudG9wLmVuZFggLSBxLnRvcC5zdGFydFgsIHEuYm90dG9tLmVuZFggLSBxLmJvdHRvbS5zdGFydFgsIHEuYm90dG9tLnkgLSBxLnRvcC55ICsgMV07XG4gICAgICBjb25zdCBzaXplID0gc3VtKGxlbmd0aHMpIC8gbGVuZ3Rocy5sZW5ndGg7XG4gICAgICBjb25zdCBzY29yZSA9IHNjb3JlUGF0dGVybih7eDogTWF0aC5yb3VuZCh4KSwgeTogTWF0aC5yb3VuZCh5KX0sIFsxLCAxLCAzLCAxLCAxXSwgbWF0cml4KTtcbiAgICAgIHJldHVybiB7IHNjb3JlLCB4LCB5LCBzaXplIH07XG4gICAgfSlcbiAgICAuZmlsdGVyKHEgPT4gISFxKSAvLyBGaWx0ZXIgb3V0IGFueSByZWplY3RlZCBxdWFkcyBmcm9tIGFib3ZlXG4gICAgLnNvcnQoKGEsIGIpID0+IGEuc2NvcmUgLSBiLnNjb3JlKVxuICAgIC8vIE5vdyB0YWtlIHRoZSB0b3AgZmluZGVyIHBhdHRlcm4gb3B0aW9ucyBhbmQgdHJ5IHRvIGZpbmQgMiBvdGhlciBvcHRpb25zIHdpdGggYSBzaW1pbGFyIHNpemUuXG4gICAgLm1hcCgocG9pbnQsIGksIGZpbmRlclBhdHRlcm5zKSA9PiB7XG4gICAgICBpZiAoaSA+IE1BWF9GSU5ERVJQQVRURVJOU19UT19TRUFSQ0gpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICBjb25zdCBvdGhlclBvaW50cyA9IGZpbmRlclBhdHRlcm5zXG4gICAgICAgIC5maWx0ZXIoKHAsIGlpKSA9PiBpICE9PSBpaSlcbiAgICAgICAgLm1hcChwID0+ICh7IHg6IHAueCwgeTogcC55LCBzY29yZTogcC5zY29yZSArICgocC5zaXplIC0gcG9pbnQuc2l6ZSkgKiogMikgLyBwb2ludC5zaXplLCBzaXplOiBwLnNpemUgfSkpXG4gICAgICAgIC5zb3J0KChhLCBiKSA9PiBhLnNjb3JlIC0gYi5zY29yZSk7XG4gICAgICBpZiAob3RoZXJQb2ludHMubGVuZ3RoIDwgMikge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNjb3JlID0gcG9pbnQuc2NvcmUgKyBvdGhlclBvaW50c1swXS5zY29yZSArIG90aGVyUG9pbnRzWzFdLnNjb3JlO1xuICAgICAgcmV0dXJuIHtwb2ludHM6IFtwb2ludF0uY29uY2F0KG90aGVyUG9pbnRzLnNsaWNlKDAsIDIpKSwgc2NvcmV9O1xuICAgIH0pXG4gICAgLmZpbHRlcihxID0+ICEhcSkgLy8gRmlsdGVyIG91dCBhbnkgcmVqZWN0ZWQgZmluZGVyIHBhdHRlcm5zIGZyb20gYWJvdmVcbiAgICAuc29ydCgoYSwgYikgPT4gYS5zY29yZSAtIGIuc2NvcmUpO1xuXG4gIGlmIChmaW5kZXJQYXR0ZXJuR3JvdXBzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgeyB0b3BSaWdodCwgdG9wTGVmdCwgYm90dG9tTGVmdCB9ID0gcmVvcmRlckZpbmRlclBhdHRlcm5zKFxuICAgIGZpbmRlclBhdHRlcm5Hcm91cHNbMF0ucG9pbnRzWzBdLCBmaW5kZXJQYXR0ZXJuR3JvdXBzWzBdLnBvaW50c1sxXSwgZmluZGVyUGF0dGVybkdyb3Vwc1swXS5wb2ludHNbMl0sXG4gICk7XG4gIGNvbnN0IGFsaWdubWVudCA9IGZpbmRBbGlnbm1lbnRQYXR0ZXJuKG1hdHJpeCwgYWxpZ25tZW50UGF0dGVyblF1YWRzLCB0b3BSaWdodCwgdG9wTGVmdCwgYm90dG9tTGVmdCk7XG4gIGNvbnN0IHJlc3VsdDogUVJMb2NhdGlvbltdID0gW107XG4gIGlmIChhbGlnbm1lbnQpIHtcbiAgICByZXN1bHQucHVzaCh7XG4gICAgICBhbGlnbm1lbnRQYXR0ZXJuOiB7IHg6IGFsaWdubWVudC5hbGlnbm1lbnRQYXR0ZXJuLngsIHk6IGFsaWdubWVudC5hbGlnbm1lbnRQYXR0ZXJuLnkgfSxcbiAgICAgIGJvdHRvbUxlZnQ6IHt4OiBib3R0b21MZWZ0LngsIHk6IGJvdHRvbUxlZnQueSB9LFxuICAgICAgZGltZW5zaW9uOiBhbGlnbm1lbnQuZGltZW5zaW9uLFxuICAgICAgdG9wTGVmdDoge3g6IHRvcExlZnQueCwgeTogdG9wTGVmdC55IH0sXG4gICAgICB0b3BSaWdodDoge3g6IHRvcFJpZ2h0LngsIHk6IHRvcFJpZ2h0LnkgfSxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFdlIG5vcm1hbGx5IHVzZSB0aGUgY2VudGVyIG9mIHRoZSBxdWFkcyBhcyB0aGUgbG9jYXRpb24gb2YgdGhlIHRyYWNraW5nIHBvaW50cywgd2hpY2ggaXMgb3B0aW1hbCBmb3IgbW9zdCBjYXNlcyBhbmQgd2lsbCBhY2NvdW50XG4gIC8vIGZvciBhIHNrZXcgaW4gdGhlIGltYWdlLiBIb3dldmVyLCBJbiBzb21lIGNhc2VzLCBhIHNsaWdodCBza2V3IG1pZ2h0IG5vdCBiZSByZWFsIGFuZCBpbnN0ZWFkIGJlIGNhdXNlZCBieSBpbWFnZSBjb21wcmVzc2lvblxuICAvLyBlcnJvcnMgYW5kL29yIGxvdyByZXNvbHV0aW9uLiBGb3IgdGhvc2UgY2FzZXMsIHdlJ2QgYmUgYmV0dGVyIG9mZiBjZW50ZXJpbmcgdGhlIHBvaW50IGV4YWN0bHkgaW4gdGhlIG1pZGRsZSBvZiB0aGUgYmxhY2sgYXJlYS4gV2VcbiAgLy8gY29tcHV0ZSBhbmQgcmV0dXJuIHRoZSBsb2NhdGlvbiBkYXRhIGZvciB0aGUgbmFpdmVseSBjZW50ZXJlZCBwb2ludHMgYXMgaXQgaXMgbGl0dGxlIGFkZGl0aW9uYWwgd29yayBhbmQgYWxsb3dzIGZvciBtdWx0aXBsZVxuICAvLyBhdHRlbXB0cyBhdCBkZWNvZGluZyBoYXJkZXIgaW1hZ2VzLlxuICBjb25zdCBtaWRUb3BSaWdodCA9IHJlY2VudGVyTG9jYXRpb24obWF0cml4LCB0b3BSaWdodCk7XG4gIGNvbnN0IG1pZFRvcExlZnQgPSByZWNlbnRlckxvY2F0aW9uKG1hdHJpeCwgdG9wTGVmdCk7XG4gIGNvbnN0IG1pZEJvdHRvbUxlZnQgPSByZWNlbnRlckxvY2F0aW9uKG1hdHJpeCwgYm90dG9tTGVmdCk7XG4gIGNvbnN0IGNlbnRlcmVkQWxpZ25tZW50ID0gZmluZEFsaWdubWVudFBhdHRlcm4obWF0cml4LCBhbGlnbm1lbnRQYXR0ZXJuUXVhZHMsIG1pZFRvcFJpZ2h0LCBtaWRUb3BMZWZ0LCBtaWRCb3R0b21MZWZ0KTtcbiAgaWYgKGNlbnRlcmVkQWxpZ25tZW50KSB7XG4gICAgcmVzdWx0LnB1c2goe1xuICAgICAgYWxpZ25tZW50UGF0dGVybjogeyB4OiBjZW50ZXJlZEFsaWdubWVudC5hbGlnbm1lbnRQYXR0ZXJuLngsIHk6IGNlbnRlcmVkQWxpZ25tZW50LmFsaWdubWVudFBhdHRlcm4ueSB9LFxuICAgICAgYm90dG9tTGVmdDogeyB4OiBtaWRCb3R0b21MZWZ0LngsIHk6IG1pZEJvdHRvbUxlZnQuIHkgfSxcbiAgICAgIHRvcExlZnQ6IHsgeDogbWlkVG9wTGVmdC54LCB5OiBtaWRUb3BMZWZ0LiB5IH0sXG4gICAgICB0b3BSaWdodDogeyB4OiBtaWRUb3BSaWdodC54LCB5OiBtaWRUb3BSaWdodC4geSB9LFxuICAgICAgZGltZW5zaW9uOiBjZW50ZXJlZEFsaWdubWVudC5kaW1lbnNpb24sXG4gICAgfSk7XG4gIH1cblxuICBpZiAocmVzdWx0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZmluZEFsaWdubWVudFBhdHRlcm4obWF0cml4OiBCaXRNYXRyaXgsIGFsaWdubWVudFBhdHRlcm5RdWFkczogUXVhZFtdLCB0b3BSaWdodDogUG9pbnQsIHRvcExlZnQ6IFBvaW50LCBib3R0b21MZWZ0OiBQb2ludCkge1xuICAvLyBOb3cgdGhhdCB3ZSd2ZSBmb3VuZCB0aGUgdGhyZWUgZmluZGVyIHBhdHRlcm5zIHdlIGNhbiBkZXRlcm1pbmUgdGhlIGJsb2NrU2l6ZSBhbmQgdGhlIHNpemUgb2YgdGhlIFFSIGNvZGUuXG4gIC8vIFdlJ2xsIHVzZSB0aGVzZSB0byBoZWxwIGZpbmQgdGhlIGFsaWdubWVudCBwYXR0ZXJuIGJ1dCBhbHNvIGxhdGVyIHdoZW4gd2UgZG8gdGhlIGV4dHJhY3Rpb24uXG4gIGxldCBkaW1lbnNpb246IG51bWJlcjtcbiAgbGV0IG1vZHVsZVNpemU6IG51bWJlcjtcbiAgdHJ5IHtcbiAgICAoeyBkaW1lbnNpb24sIG1vZHVsZVNpemUgfSA9IGNvbXB1dGVEaW1lbnNpb24odG9wTGVmdCwgdG9wUmlnaHQsIGJvdHRvbUxlZnQsIG1hdHJpeCkpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBOb3cgZmluZCB0aGUgYWxpZ25tZW50IHBhdHRlcm5cbiAgY29uc3QgYm90dG9tUmlnaHRGaW5kZXJQYXR0ZXJuID0geyAvLyBCZXN0IGd1ZXNzIGF0IHdoZXJlIGEgYm90dG9tUmlnaHQgZmluZGVyIHBhdHRlcm4gd291bGQgYmVcbiAgICB4OiB0b3BSaWdodC54IC0gdG9wTGVmdC54ICsgYm90dG9tTGVmdC54LFxuICAgIHk6IHRvcFJpZ2h0LnkgLSB0b3BMZWZ0LnkgKyBib3R0b21MZWZ0LnksXG4gIH07XG4gIGNvbnN0IG1vZHVsZXNCZXR3ZWVuRmluZGVyUGF0dGVybnMgPSAoKGRpc3RhbmNlKHRvcExlZnQsIGJvdHRvbUxlZnQpICsgZGlzdGFuY2UodG9wTGVmdCwgdG9wUmlnaHQpKSAvIDIgLyBtb2R1bGVTaXplKTtcbiAgY29uc3QgY29ycmVjdGlvblRvVG9wTGVmdCA9IDEgLSAoMyAvIG1vZHVsZXNCZXR3ZWVuRmluZGVyUGF0dGVybnMpO1xuICBjb25zdCBleHBlY3RlZEFsaWdubWVudFBhdHRlcm4gPSB7XG4gICAgeDogdG9wTGVmdC54ICsgY29ycmVjdGlvblRvVG9wTGVmdCAqIChib3R0b21SaWdodEZpbmRlclBhdHRlcm4ueCAtIHRvcExlZnQueCksXG4gICAgeTogdG9wTGVmdC55ICsgY29ycmVjdGlvblRvVG9wTGVmdCAqIChib3R0b21SaWdodEZpbmRlclBhdHRlcm4ueSAtIHRvcExlZnQueSksXG4gIH07XG5cbiAgY29uc3QgYWxpZ25tZW50UGF0dGVybnMgPSBhbGlnbm1lbnRQYXR0ZXJuUXVhZHNcbiAgICAubWFwKHEgPT4ge1xuICAgICAgY29uc3QgeCA9IChxLnRvcC5zdGFydFggKyBxLnRvcC5lbmRYICsgcS5ib3R0b20uc3RhcnRYICsgcS5ib3R0b20uZW5kWCkgLyA0O1xuICAgICAgY29uc3QgeSA9IChxLnRvcC55ICsgcS5ib3R0b20ueSArIDEpIC8gMjtcbiAgICAgIGlmICghbWF0cml4LmdldChNYXRoLmZsb29yKHgpLCBNYXRoLmZsb29yKHkpKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHNpemVTY29yZSA9IHNjb3JlUGF0dGVybih7eDogTWF0aC5mbG9vcih4KSwgeTogTWF0aC5mbG9vcih5KX0sIFsxLCAxLCAxXSwgbWF0cml4KTtcbiAgICAgIGNvbnN0IHNjb3JlID0gc2l6ZVNjb3JlICsgZGlzdGFuY2Uoe3gsIHl9LCBleHBlY3RlZEFsaWdubWVudFBhdHRlcm4pO1xuICAgICAgcmV0dXJuIHsgeCwgeSwgc2NvcmUgfTtcbiAgICB9KVxuICAgIC5maWx0ZXIodiA9PiAhIXYpXG4gICAgLnNvcnQoKGEsIGIpID0+IGEuc2NvcmUgLSBiLnNjb3JlKTtcblxuICAvLyBJZiB0aGVyZSBhcmUgbGVzcyB0aGFuIDE1IG1vZHVsZXMgYmV0d2VlbiBmaW5kZXIgcGF0dGVybnMgaXQncyBhIHZlcnNpb24gMSBRUiBjb2RlIGFuZCBhcyBzdWNoIGhhcyBubyBhbGlnbm1lbW50IHBhdHRlcm5cbiAgLy8gc28gd2UgY2FuIG9ubHkgdXNlIG91ciBiZXN0IGd1ZXNzLlxuICBjb25zdCBhbGlnbm1lbnRQYXR0ZXJuID0gbW9kdWxlc0JldHdlZW5GaW5kZXJQYXR0ZXJucyA+PSAxNSAmJiBhbGlnbm1lbnRQYXR0ZXJucy5sZW5ndGggPyBhbGlnbm1lbnRQYXR0ZXJuc1swXSA6IGV4cGVjdGVkQWxpZ25tZW50UGF0dGVybjtcblxuICByZXR1cm4geyBhbGlnbm1lbnRQYXR0ZXJuLCBkaW1lbnNpb24gfTtcbn1cbiJdfQ==