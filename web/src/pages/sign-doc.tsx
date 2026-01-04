import { useState, useRef } from "react";
import { useParams } from "react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument } from "pdf-lib";
import { viewDoc, signDoc, getFileUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignaturePad, type SignaturePadRef } from "@/components/signature-pad";
import {
    Loader2,
    AlertCircle,
    CheckCircle2,
    FileText,
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    Send,
    PenTool,
} from "lucide-react";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function SignDocPage() {
    const { "doc-id": docId } = useParams<{ "doc-id": string }>();
    const signaturePadRef = useRef<SignaturePadRef>(null);

    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1);
    const [hasSignature, setHasSignature] = useState(false);
    const [signerName, setSignerName] = useState("");
    const [remarks, setRemarks] = useState("");
    const [signaturePosition, setSignaturePosition] = useState<{ x: number; y: number; page: number } | null>(null);
    const [isPlacingSignature, setIsPlacingSignature] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["view-doc", docId],
        queryFn: () => viewDoc(docId!),
        enabled: !!docId,
    });


    const doc = data?.data;

    const signMutation = useMutation({
        mutationFn: async () => {
            if (!doc || !signaturePosition || !hasSignature) {
                throw new Error("Please add your signature to the document");
            }

            const signatureDataUrl = signaturePadRef.current?.getDataUrl();
            if (!signatureDataUrl) {
                throw new Error("Failed to get signature");
            }

            // Fetch the original PDF
            const pdfUrl = getFileUrl(doc.originalPath);
            const pdfResponse = await fetch(pdfUrl);
            const pdfBytes = await pdfResponse.arrayBuffer();

            // Load PDF and add signature
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();
            const targetPage = pages[signaturePosition.page - 1];

            // Convert signature data URL to image
            const signatureImage = await pdfDoc.embedPng(signatureDataUrl);

            // Calculate signature dimensions (maintain aspect ratio)
            const signatureWidth = 150;
            const signatureHeight = (signatureImage.height / signatureImage.width) * signatureWidth;

            // Draw signature on the page
            const pageHeight = targetPage.getHeight();
            targetPage.drawImage(signatureImage, {
                x: signaturePosition.x,
                y: pageHeight - signaturePosition.y - signatureHeight, // PDF coordinates are from bottom
                width: signatureWidth,
                height: signatureHeight,
            });

            // Save the modified PDF
            const modifiedPdfBytes = await pdfDoc.save();
            // @ts-ignore
            const pdfBlob = new Blob([modifiedPdfBytes], { type: "application/pdf" });

            // Create form data and submit
            const formData = new FormData();
            formData.append("file", pdfBlob, `signed_${doc.originalName}`);
            formData.append("remarks", remarks);
            formData.append("metadata", signerName);

            return signDoc(docId!, formData);
        },
        onSuccess: () => {
            setSubmitSuccess(true);
        },
    });

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isPlacingSignature || !hasSignature) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;

        setSignaturePosition({ x, y, page: currentPage });
        setIsPlacingSignature(false);
    };

    // If document is already signed
    if (doc?.isSigned) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 p-3 rounded-full bg-green-500/10">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <CardTitle>Document Already Signed</CardTitle>
                        <CardDescription>
                            This document has already been signed and cannot be modified.
                        </CardDescription>
                    </CardHeader>
                    {doc.signedAt && (
                        <CardContent className="text-center text-sm text-muted-foreground">
                            Signed on {new Date(doc.signedAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }

    // Success state
    if (submitSuccess) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 p-3 rounded-full bg-green-500/10">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <CardTitle>Document Signed Successfully!</CardTitle>
                        <CardDescription>
                            Thank you for signing the document. The document owner has been notified.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isError || !doc) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10">
                            <AlertCircle className="h-8 w-8 text-destructive" />
                        </div>
                        <CardTitle>Document Not Found</CardTitle>
                        <CardDescription>
                            This document doesn't exist, has been deleted, or you don't have permission to view it.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg font-semibold truncate">{doc.title}</h1>
                            <p className="text-xs text-muted-foreground">Review and sign this document</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-6">
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* PDF Viewer */}
                    <div className="lg:col-span-2">
                        <Card>
                            {/* PDF Controls */}
                            <div className="flex items-center justify-between p-3 border-b">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm min-w-[80px] text-center">
                                        {currentPage} / {numPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                                        disabled={currentPage === numPages}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
                                    >
                                        <ZoomOut className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm min-w-[50px] text-center">
                                        {Math.round(scale * 100)}%
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setScale((s) => Math.min(2, s + 0.25))}
                                    >
                                        <ZoomIn className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* PDF Document */}
                            <CardContent className="p-4 overflow-auto max-h-[70vh] bg-muted/50">
                                <div
                                    className={`relative inline-block ${isPlacingSignature ? "cursor-crosshair" : ""
                                        }`}
                                    onClick={handlePageClick}
                                >
                                    <Document
                                        file={getFileUrl(doc.originalPath)}
                                        onLoadSuccess={onDocumentLoadSuccess}
                                        loading={
                                            <div className="flex items-center justify-center p-8">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            </div>
                                        }
                                        error={
                                            <div className="flex flex-col items-center justify-center p-8 text-center">
                                                <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                                                <p className="text-sm text-muted-foreground">
                                                    Failed to load PDF
                                                </p>
                                            </div>
                                        }
                                    >
                                        <Page
                                            pageNumber={currentPage}
                                            scale={scale}
                                            renderTextLayer={false}
                                        />
                                    </Document>

                                    {/* Signature Overlay */}
                                    {signaturePosition && signaturePosition.page === currentPage && (
                                        <div
                                            className="absolute border-2 border-primary bg-white/80 p-1 rounded shadow-lg"
                                            style={{
                                                left: signaturePosition.x * scale,
                                                top: signaturePosition.y * scale,
                                                width: 150 * scale,
                                            }}
                                        >
                                            <img
                                                src={signaturePadRef.current?.getDataUrl()}
                                                alt="Signature"
                                                className="w-full"
                                            />
                                        </div>
                                    )}

                                    {isPlacingSignature && (
                                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                            <Badge className="gap-2">
                                                <PenTool className="h-4 w-4" />
                                                Click where you want to place your signature
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Signing Panel */}
                    <div className="space-y-4">
                        {/* Signature Input */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Your Signature</CardTitle>
                                <CardDescription>
                                    Draw or upload your signature below
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SignaturePad
                                    ref={signaturePadRef}
                                    onChange={setHasSignature}
                                />

                                {hasSignature && (
                                    <Button
                                        className="w-full mt-4 gap-2"
                                        variant={signaturePosition ? "outline" : "default"}
                                        onClick={() => setIsPlacingSignature(true)}
                                    >
                                        <PenTool className="h-4 w-4" />
                                        {signaturePosition ? "Reposition Signature" : "Place Signature on PDF"}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* Signer Details */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Your Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="signerName">Full Name</Label>
                                    <Input
                                        id="signerName"
                                        value={signerName}
                                        onChange={(e) => setSignerName(e.target.value)}
                                        placeholder="Enter your full name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="remarks">Remarks (Optional)</Label>
                                    <Textarea
                                        id="remarks"
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        placeholder="Any additional notes"
                                        rows={2}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Submit */}
                        <Card>
                            <CardContent className="pt-6">
                                {signMutation.isError && (
                                    <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
                                        {signMutation.error instanceof Error
                                            ? signMutation.error.message
                                            : "Failed to submit signature"}
                                    </div>
                                )}

                                <Button
                                    className="w-full gap-2"
                                    size="lg"
                                    onClick={() => signMutation.mutate()}
                                    disabled={
                                        !hasSignature ||
                                        !signaturePosition ||
                                        !signerName.trim() ||
                                        signMutation.isPending
                                    }
                                >
                                    {signMutation.isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4" />
                                            Submit Signed Document
                                        </>
                                    )}
                                </Button>

                                {(!hasSignature || !signaturePosition || !signerName.trim()) && (
                                    <p className="text-xs text-muted-foreground mt-2 text-center">
                                        {!hasSignature
                                            ? "Please add your signature"
                                            : !signaturePosition
                                                ? "Please place your signature on the PDF"
                                                : "Please enter your name"}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}