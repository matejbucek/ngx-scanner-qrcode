import { ElementRef, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import * as i0 from "@angular/core";
export declare class NgxScannerQrcodeComponent implements OnInit, OnDestroy {
    video: ElementRef;
    canvas: ElementRef;
    error: EventEmitter<any>;
    event: EventEmitter<string>;
    medias: MediaStreamConstraints;
    isStart: boolean;
    isLoading: boolean;
    data: string;
    /**
     * Properties
     * CanvasRenderingContext2D
     * https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
     */
    frameConfig: Object;
    textConfig: Object;
    ngOnInit(): void;
    /**
     * initBackgroundColor
     */
    private initBackgroundColor;
    /**
     * toggleCamera
     */
    toggleCamera(): void;
    /**
     * start
     * @returns
     */
    start(): void;
    /**
     * Video play
     * @return void
     */
    play(): void;
    /**
     * Video pause
     * @return void
     */
    pause(): void;
    /**
     * Video stop
     * @return void
     */
    stop(): void;
    /**
     * Download image
     * @param fileName eg: demo.png
     * @return string
     */
    download(fileName: string): string;
    ngOnDestroy(): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<NgxScannerQrcodeComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<NgxScannerQrcodeComponent, "ngx-scanner-qrcode", ["scanner"], { "frameConfig": "frameConfig"; "textConfig": "textConfig"; }, { "data": "data"; "error": "error"; }, never, ["*"], false>;
}
