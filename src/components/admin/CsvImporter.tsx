"use client";

import React, { useState } from "react";
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Chip
} from "@heroui/react";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import Papa from "papaparse";
import { useAdminModalPreset } from "@/app/(dashboard)/admin/ui/modalPresets";

interface Props {
  buttonLabel?: string;
  title: string;
  expectedColumns: string[];
  onImport: (rows: any[]) => Promise<{ success: number; errors: number; message?: string }>;
  onSuccess?: () => void;
}

export default function CsvImporter({
  buttonLabel = "Importar CSV",
  title,
  expectedColumns,
  onImport,
  onSuccess
}: Props) {
  const modalPreset = useAdminModalPreset();
  const [isOpen, setIsOpen] = useState(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number; message?: string } | null>(null);

  const resetState = () => {
    setFile(null);
    setParsedRows([]);
    setColumns([]);
    setError(null);
    setResult(null);
    setIsImporting(false);
  };

  const handleOpen = () => {
    resetState();
    setIsOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    setFile(selected);
    setError(null);
    setResult(null);

    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`Error parseando CSV: ${results.errors[0].message}`);
          return;
        }

        if (!results.meta.fields || results.meta.fields.length === 0) {
          setError("El archivo CSV no tiene columnas detectables.");
          return;
        }

        // Validate expected columns
        const missingCols = expectedColumns.filter(c => !results.meta.fields!.includes(c));
        if (missingCols.length > 0) {
          setError(`Faltan columnas requeridas: ${missingCols.join(", ")}`);
          return;
        }

        setColumns(results.meta.fields);
        setParsedRows(results.data);
      },
      error: (err) => {
        setError(`Error leyendo archivo: ${err.message}`);
      }
    });
  };

  const executeImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setError(null);

    try {
      const res = await onImport(parsedRows);
      setResult(res);
      if (onSuccess) onSuccess();
    } catch (e: any) {
      setError(e.message || "Error fatal durante la importación.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Button color="primary" variant="flat" startContent={<Upload className="w-4 h-4" />} onPress={handleOpen}>
        {buttonLabel}
      </Button>

      <Modal isOpen={isOpen} onOpenChange={setIsOpen} size="4xl" {...modalPreset}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className={modalPreset.classNames?.header}>
                <div className="font-semibold text-lg">{title}</div>
              </ModalHeader>
              <ModalBody className={modalPreset.classNames?.body}>
                {!result ? (
                  <div className="flex flex-col gap-4">
                    <div className="p-4 border border-default-200 border-dashed rounded-lg bg-default-50/50">
                      <label className="flex flex-col items-center justify-center cursor-pointer w-full h-24">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-6 h-6 mb-2 text-default-500" />
                          <p className="mb-1 text-sm text-default-500 font-semibold">
                            Haz click para seleccionar un archivo CSV
                          </p>
                          <p className="text-xs text-default-400">Columnas esperadas: {expectedColumns.join(", ")}</p>
                        </div>
                        <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                      </label>
                    </div>

                    {file && !error && parsedRows.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium">Previsualización (Primeras 5 filas de {parsedRows.length})</h3>
                          <Chip size="sm" color="success" variant="flat">
                            {parsedRows.length} filas detectadas
                          </Chip>
                        </div>
                        
                        <div className="max-h-[300px] overflow-auto border border-white/10 rounded-lg">
                          <Table aria-label="Previsualización CSV" removeWrapper isCompact className="bg-transparent" classNames={{ th: "bg-content2 text-default-500" }}>
                            <TableHeader>
                              {columns.map(c => (
                                <TableColumn key={c}>{c}</TableColumn>
                              ))}
                            </TableHeader>
                            <TableBody>
                              {parsedRows.slice(0, 5).map((row, i) => (
                                <TableRow key={i}>
                                  {columns.map(c => (
                                    <TableCell key={c}>
                                      <span className="truncate max-w-[150px] inline-block">{row[c] || ""}</span>
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="p-3 rounded-lg bg-danger-50 text-danger-500 flex items-start gap-2 border border-danger-200">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p className="text-sm">{error}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center justify-center text-center gap-4">
                    <CheckCircle2 className="w-16 h-16 text-success-500" />
                    <div>
                      <h3 className="text-xl font-bold mb-1">Importación Finalizada</h3>
                      <p className="text-default-500 mb-4">{result.message || "Las filas fueron procesadas."}</p>
                      <div className="flex gap-4 justify-center">
                        <Chip color="success" variant="flat">Éxitos: {result.success}</Chip>
                        {result.errors > 0 && <Chip color="danger" variant="flat">Errores: {result.errors}</Chip>}
                      </div>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                {!result ? (
                  <>
                    <Button variant="light" onPress={onClose} isDisabled={isImporting}>Cancelar</Button>
                    <Button color="primary" onPress={executeImport} isLoading={isImporting} isDisabled={!parsedRows.length || !!error}>
                      Ejecutar Inserción Masiva
                    </Button>
                  </>
                ) : (
                  <Button color="primary" onPress={onClose}>Cerrar</Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
