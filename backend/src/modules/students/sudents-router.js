const express = require("express");
const router = express.Router();
const studentController = require("./students-controller");
const { validateRequest } = require("../../utils");
const {
    StudentIdParamSchema,
    StudentCreateSchema,
    StudentUpdateSchema
} = require("./student-schema");

router.get("", studentController.handleGetAllStudents);
router.post("", validateRequest(StudentCreateSchema), studentController.handleAddStudent);
router.get("/:id", validateRequest(StudentIdParamSchema), studentController.handleGetStudentDetail);
router.post("/:id/status", validateRequest(StudentIdParamSchema), studentController.handleStudentStatus);
router.put("/:id", validateRequest(StudentUpdateSchema), studentController.handleUpdateStudent);
router.delete("/:id", validateRequest(StudentIdParamSchema), studentController.handleDeleteStudent);

module.exports = { studentsRoutes: router };
