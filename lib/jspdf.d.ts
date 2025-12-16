// jspdf.d.ts (REVISED FOR CONSISTENCY)

import { jsPDF } from 'jspdf';
import { UserOptions } from 'jspdf-autotable';

// Define the properties added to the autoTable function itself
interface AutoTableFunctionProperties {
    previous: {
        finalY: number;
    };
    // If you need to access themes:
    // theme: { plain: {}, grid: {}, striped: {} }; 
}

// Combine the function signature and the properties for declaration merging
type AutoTable = ((options: UserOptions) => jsPDF) & AutoTableFunctionProperties;


declare module 'jspdf' {
    interface jsPDF {
        // Declares the autoTable method and its associated properties
        autoTable: AutoTable;
    }
}